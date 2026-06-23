import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { CHECKLIST_TEMPLATE, DEFAULT_CATEGORIES } from "../data/checklistTemplate.js";

const FONT_DISPLAY = "'Playfair Display', serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const COLORS = {
  bg: "#0C0C0C",
  bgAlt: "#141414",
  bgCard: "#161616",
  border: "#2A2A2A",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  text: "#F5F5F5",
  muted: "#8A8A8A",
  danger: "#E0483E",
};

function getProjectIdFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("project");
}

function setProjectIdInUrl(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("project", id);
  else url.searchParams.delete("project");
  window.history.replaceState({}, "", url);
}

export default function ChecklistApp() {
  const configured = !!supabase;

  const [projects, setProjects] = useState(null); // null = loading
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [items, setItems] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [addingCategory, setAddingCategory] = useState(null);
  const [addingText, setAddingText] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the list of projects once.
  useEffect(() => {
    if (!configured) {
      setLoadError(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setLoadError(true);
        return;
      }
      setProjects(data);
      if (data.length === 0) {
        setCreatingProject(true);
        return;
      }
      const urlId = getProjectIdFromUrl();
      const initial = data.find((p) => p.id === urlId)?.id || data[0].id;
      setSelectedProjectId(initial);
      setProjectIdInUrl(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const loadItems = useCallback(async (projectId) => {
    setItems(null);
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    if (error) {
      setLoadError(true);
      return;
    }
    setItems(data);
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadItems(selectedProjectId);
  }, [selectedProjectId, loadItems]);

  function switchProject(id) {
    setSelectedProjectId(id);
    setProjectIdInUrl(id);
  }

  async function createProject(name) {
    if (!name.trim() || busy) return;
    setBusy(true);
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error || !project) {
      setBusy(false);
      window.alert("No se pudo crear el proyecto. Intenta de nuevo.");
      return;
    }
    const rows = CHECKLIST_TEMPLATE.map((t, i) => ({
      project_id: project.id,
      category: t.category,
      description: t.description,
      completed: false,
      sort_order: i,
    }));
    await supabase.from("checklist_items").insert(rows);
    setProjects((prev) => [...(prev || []), project]);
    setCreatingProject(false);
    setNewProjectName("");
    setBusy(false);
    switchProject(project.id);
  }

  async function deleteProject(id) {
    if (!window.confirm("¿Eliminar este proyecto y todos sus items? Esta acción no se puede deshacer.")) return;
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedProjectId === id) {
        const nextId = next[0]?.id || null;
        switchProject(nextId);
        if (!nextId) setItems([]);
      }
      return next;
    });
  }

  function toggleItem(item) {
    const nextCompleted = !item.completed;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: nextCompleted } : i)));
    supabase
      .from("checklist_items")
      .update({ completed: nextCompleted })
      .eq("id", item.id)
      .then(({ error }) => {
        if (error) {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: !nextCompleted } : i)));
        }
      });
  }

  function startEditingItem(item) {
    setEditingItemId(item.id);
    setEditingText(item.description);
  }

  function cancelEditingItem() {
    setEditingItemId(null);
    setEditingText("");
  }

  function commitEditingItem(item) {
    const text = editingText.trim();
    setEditingItemId(null);
    if (!text || text === item.description) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, description: text } : i)));
    supabase
      .from("checklist_items")
      .update({ description: text })
      .eq("id", item.id)
      .then(({ error }) => {
        if (error) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, description: item.description } : i)));
      });
  }

  async function addItem(category, description) {
    if (!description.trim() || !selectedProjectId) return;
    const sameCategory = (items || []).filter((i) => i.category === category);
    const maxOrder = sameCategory.length ? Math.max(...sameCategory.map((i) => i.sort_order)) : -1;
    const { data, error } = await supabase
      .from("checklist_items")
      .insert({ project_id: selectedProjectId, category, description: description.trim(), completed: false, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (!error && data) setItems((prev) => [...(prev || []), data]);
  }

  function startAddingItem(category) {
    setAddingCategory(category);
    setAddingText("");
  }

  function commitAddingItem(category) {
    const text = addingText.trim();
    if (text) {
      addItem(category, text);
      setAddingText("");
      // Stay open so the contractor/admin can add several items in a row.
    } else {
      setAddingCategory(null);
    }
  }

  function deleteItem(id) {
    if (!window.confirm("¿Eliminar este item?")) return;
    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    supabase
      .from("checklist_items")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) setItems(prevItems);
      });
  }

  function toggleCollapsed(category) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  // Always show every default category card, even ones with zero items right
  // now — otherwise there'd be no "+" to add the first item back into it.
  // Custom (freeform) categories only show up once they have an item.
  const grouped = useMemo(() => {
    if (!items) return [];
    const byCategory = new Map();
    items.forEach((item) => {
      if (!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category).push(item);
    });
    const customCategories = [...byCategory.keys()].filter((c) => !DEFAULT_CATEGORIES.includes(c));
    const orderedCategories = [...DEFAULT_CATEGORIES, ...customCategories];
    return orderedCategories.map((category) => ({
      category,
      items: (byCategory.get(category) || []).sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [items]);

  const total = items?.length || 0;
  const done = items?.filter((i) => i.completed).length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (!configured) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>Falta configurar la conexión a la base de datos (variables de entorno).</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>No se pudo conectar con la base de datos. Recarga la página para reintentar.</div>
      </div>
    );
  }

  if (!projects) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>Cargando…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.eyebrow}>VANHEIGHT · CONTROL INTERNO</span>
        <h1 style={styles.title}>Lista de Control</h1>
        <p style={styles.subtitle}>Avance de reparación/remodelación por propiedad. Los cambios se guardan automáticamente.</p>

        <div style={styles.projectRow}>
          {projects.length > 0 && (
            <select
              value={selectedProjectId || ""}
              onChange={(e) => switchProject(e.target.value)}
              style={styles.select}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setCreatingProject(true)} style={styles.btnOutline}>
            + Nuevo proyecto
          </button>
          {selectedProjectId && (
            <button onClick={() => deleteProject(selectedProjectId)} style={styles.btnDanger}>
              Eliminar proyecto
            </button>
          )}
        </div>

        {creatingProject && (
          <div style={styles.newProjectRow}>
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject(newProjectName)}
              placeholder="Dirección o nombre del proyecto…"
              style={styles.input}
            />
            <button onClick={() => createProject(newProjectName)} disabled={busy} style={styles.btnGold}>
              Crear
            </button>
            {projects.length > 0 && (
              <button
                onClick={() => {
                  setCreatingProject(false);
                  setNewProjectName("");
                }}
                style={styles.btnGhost}
              >
                Cancelar
              </button>
            )}
          </div>
        )}

        {selectedProjectId && total > 0 && (
          <div style={styles.progressBlock}>
            <div style={styles.progressBarTrack}>
              <div style={{ ...styles.progressBarFill, width: `${pct}%` }} />
            </div>
            <span style={styles.progressText}>
              {done} de {total} completados ({pct}%)
            </span>
          </div>
        )}
      </div>

      {!selectedProjectId && !creatingProject && (
        <div style={styles.empty}>No hay proyectos todavía. Crea el primero para empezar.</div>
      )}

      {selectedProjectId && items === null && <div style={styles.empty}>Cargando items…</div>}

      {selectedProjectId && items && (
        <div style={styles.groupsWrap}>
          {grouped.map(({ category, items: catItems }) => {
            const catDone = catItems.filter((i) => i.completed).length;
            const isCollapsed = collapsed.has(category);
            const isAdding = addingCategory === category;
            return (
              <div key={category} style={styles.categoryCard}>
                <button onClick={() => toggleCollapsed(category)} style={styles.categoryHeader}>
                  <span style={styles.categoryTitle}>{category}</span>
                  <span style={styles.categoryMeta}>
                    <span style={styles.categoryCount}>
                      {catDone}/{catItems.length}
                    </span>
                    <span
                      style={{
                        ...styles.chevron,
                        transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      }}
                    >
                      ⌄
                    </span>
                  </span>
                </button>
                {!isCollapsed && (
                  <div>
                    {catItems.map((item) => (
                      <div key={item.id} style={styles.itemRow}>
                        <button
                          onClick={() => toggleItem(item)}
                          style={{ ...styles.checkCircle, ...(item.completed ? styles.checkCircleDone : {}) }}
                          aria-label="Marcar completado"
                        >
                          {item.completed && <span style={styles.checkMark}>✓</span>}
                        </button>
                        {editingItemId === item.id ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEditingItem(item);
                              if (e.key === "Escape") cancelEditingItem();
                            }}
                            onBlur={() => commitEditingItem(item)}
                            style={{ ...styles.input, ...styles.itemEditInput }}
                          />
                        ) : (
                          <span
                            onClick={() => startEditingItem(item)}
                            style={{ ...styles.itemText, ...(item.completed ? styles.itemTextDone : {}) }}
                          >
                            {item.description}
                          </span>
                        )}
                        <button onClick={() => deleteItem(item.id)} style={styles.deleteBtn} aria-label="Eliminar item">
                          ×
                        </button>
                      </div>
                    ))}
                    {isAdding ? (
                      <div style={styles.itemRow}>
                        <span style={styles.addSpacer} />
                        <input
                          autoFocus
                          value={addingText}
                          onChange={(e) => setAddingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitAddingItem(category);
                            if (e.key === "Escape") {
                              setAddingText("");
                              setAddingCategory(null);
                            }
                          }}
                          onBlur={() => commitAddingItem(category)}
                          placeholder="Descripción del nuevo item…"
                          style={{ ...styles.input, flex: 1 }}
                        />
                      </div>
                    ) : (
                      <button onClick={() => startAddingItem(category)} style={styles.addItemRow}>
                        + Agregar item
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: FONT_BODY,
    background: COLORS.bg,
    color: COLORS.text,
    minHeight: "100vh",
    padding: "0 0 60px",
    boxSizing: "border-box",
  },
  header: {
    padding: "32px 20px 20px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.bgAlt,
  },
  eyebrow: { fontSize: 11, letterSpacing: "0.18em", color: COLORS.gold, fontWeight: 700 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 30, margin: "6px 0 6px", fontWeight: 700 },
  subtitle: { margin: "0 0 16px", color: COLORS.muted, fontSize: 13, maxWidth: 560, lineHeight: 1.5 },

  projectRow: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" },
  newProjectRow: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 12 },

  select: {
    background: COLORS.bgCard,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13.5,
    minWidth: 160,
  },
  input: {
    background: COLORS.bgCard,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13.5,
  },

  btnGold: {
    background: "linear-gradient(180deg, #D4B460 0%, #C9A84C 50%, #B8922E 100%)",
    color: "#000",
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 13,
    letterSpacing: "0.04em",
    cursor: "pointer",
    flexShrink: 0,
  },
  btnOutline: {
    background: "transparent",
    color: COLORS.gold,
    border: `1.5px solid ${COLORS.gold}`,
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: COLORS.muted,
    border: "none",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  btnDanger: {
    background: "transparent",
    color: COLORS.danger,
    border: `1px solid ${COLORS.danger}`,
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: "auto",
  },

  progressBlock: { marginTop: 18, maxWidth: 480 },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #C9A84C 0%, #E8C97A 100%)",
    transition: "width 0.3s ease",
  },
  progressText: { display: "block", marginTop: 6, fontSize: 12.5, color: COLORS.muted },

  empty: { color: COLORS.muted, padding: "60px 20px", textAlign: "center", fontSize: 14 },

  groupsWrap: { padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 14, maxWidth: 720, margin: "0 auto" },
  categoryCard: { background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" },
  categoryHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  categoryTitle: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: COLORS.text },
  categoryMeta: { display: "flex", alignItems: "center", gap: 10 },
  categoryCount: { fontSize: 12, color: COLORS.gold, fontWeight: 700 },
  chevron: { color: COLORS.muted, fontSize: 16, transition: "transform 0.2s ease", display: "inline-block" },

  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderTop: `1px solid ${COLORS.border}`,
  },
  checkCircle: {
    width: 26,
    height: 26,
    minWidth: 26,
    borderRadius: "50%",
    border: `2px solid ${COLORS.muted}`,
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },
  checkCircleDone: {
    border: `2px solid ${COLORS.gold}`,
    background: COLORS.gold,
  },
  checkMark: { color: "#000", fontSize: 14, fontWeight: 900, lineHeight: 1 },
  itemText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 1.4, cursor: "text" },
  itemTextDone: { color: COLORS.muted, textDecoration: "line-through" },
  itemEditInput: { flex: 1, padding: "4px 8px", fontSize: 14 },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.muted,
    fontSize: 20,
    lineHeight: 1,
    cursor: "pointer",
    padding: "0 4px",
    flexShrink: 0,
  },

  addItemRow: {
    width: "100%",
    display: "block",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderTop: `1px solid ${COLORS.border}`,
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: 600,
    padding: "12px 16px",
    cursor: "pointer",
  },
  addSpacer: { width: 26, minWidth: 26, flexShrink: 0 },
};
