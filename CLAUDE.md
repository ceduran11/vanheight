# VanHeight Website — CLAUDE.md

## Project Purpose

Marketing/branding website for **VanHeight**, a premium home remodeling company based in **The Woodlands, Texas**. Services offered: kitchen remodeling, bathroom remodeling, flooring, interior & exterior painting, home additions, and custom carpentry.

This is a **static presentation site** (no CMS, no database). Content is hardcoded in `.astro` files. Dynamic features (client portal, calculators) are planned for a future phase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 6.x (static output) |
| Styles | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Language | TypeScript |
| Hosting target | Vercel (static) |
| Node | >=22.12.0 |

No React, Vue, or other UI framework — all components are `.astro` files with vanilla JS where interactivity is needed.

---

## Commands

```bash
npm run dev       # Start dev server (http://localhost:4321)
npm run build     # Build to ./dist/
npm run preview   # Preview the production build locally
```

---

## Folder Structure

```
website/
├── public/
│   ├── images/          # Real project photos (kitchen, bathroom, etc.)
│   ├── favicon.svg
│   └── favicon.ico
├── src/
│   ├── components/      # Reusable Astro components
│   │   ├── Header.astro       # Sticky nav with scroll effect + EN/ES toggle
│   │   ├── Hero.astro         # Full-screen hero with background image
│   │   ├── Services.astro     # 6-service grid (home page)
│   │   ├── GalleryPreview.astro # 4-project preview grid (home page)
│   │   ├── WhyUs.astro        # Two-column: image + reasons list
│   │   ├── Testimonials.astro # 3-column customer reviews
│   │   ├── CTA.astro          # Centered call-to-action section
│   │   └── Footer.astro       # 4-column footer with links + contact
│   ├── layouts/
│   │   └── Layout.astro       # Base HTML shell, imports global.css, fonts, scroll observer
│   ├── lib/
│   │   └── translations.ts    # EN/ES translation strings (used for future i18n)
│   ├── pages/
│   │   ├── index.astro        # Home page
│   │   ├── gallery.astro      # Portfolio with category filter
│   │   ├── about.astro        # Company story, values, stats
│   │   ├── contact.astro      # Quote request form
│   │   └── services/
│   │       └── index.astro    # Full services list (alternating layout)
│   └── styles/
│       └── global.css         # Tailwind v4 import + custom utility classes
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Design System

### Color Palette (dark/premium theme)

| Variable | Hex | Usage |
|----------|-----|-------|
| Background | `#0C0C0C` | Main background |
| Background alt | `#141414` | Alternate sections |
| Gold accent | `#C9A84C` | CTAs, labels, highlights |
| Gold light | `#E8C97A` | Hover state for gold |
| Text | `#F5F5F5` | Primary text |
| Muted text | `#8A8A8A` | Secondary text, descriptions |
| Border | `#2A2A2A` | Dividers and grid gaps |

### Typography

- **Headings:** `Playfair Display` (serif, loaded via Google Fonts) — weights 400–700
- **Body/UI:** `Inter` (sans-serif) — weights 300–700
- **Section labels:** `0.75rem`, `tracking-[0.2em]`, uppercase, gold color

### Custom Utility Classes (in `global.css`)

- `.btn-gold` — filled gold CTA button
- `.btn-outline` — bordered gold button, fills on hover
- `.section-label` — small uppercase gold label above headings
- `.fade-in` / `.visible` — scroll-triggered fade animation (driven by IntersectionObserver in `Layout.astro`)
- `.text-gold`, `.bg-gold`, `.border-gold` — color shortcuts
- `.bg-dark`, `.bg-dark2` — background shortcuts
- `.text-muted-custom`, `.border-subtle` — muted colors

---

## Key Behaviors

### Header scroll effect
The header starts transparent (over the hero image) and transitions to `rgba(12,12,12,0.97)` with `backdrop-filter: blur(10px)` after scrolling 80px. Logic lives in the `<script>` block of `Header.astro`.

### Mobile menu
Hamburger → animated X via CSS transforms on three `<span>` lines. Menu slides open as a vertical list. Logic in `Header.astro`.

### Language toggle (EN/ES)
- Toggle button in the header switches between English and Spanish.
- Language preference stored in `localStorage` under key `'language'`.
- On change, fires a `CustomEvent('languageChange')` caught by `Layout.astro`, which reloads the page.
- `html[data-lang]` attribute is set on `<html>` for future CSS/JS targeting.
- Translation strings live in `src/lib/translations.ts` — **not yet wired into components** (strings are still hardcoded in each `.astro` file). Connecting translations to components is a pending task.

### Gallery filter
Client-side JS in `gallery.astro` filters `.gallery-item` elements by `data-category` attribute. No framework needed.

### Scroll animations
`IntersectionObserver` in `Layout.astro` watches all `.fade-in` elements and adds `.visible` (opacity 1, translateY 0) when they enter the viewport.

### Contact form
Currently fires `e.preventDefault()` and shows a success message. **Needs to be wired to a form backend** (Formspree, Netlify Forms, or Resend). Look for the `// TODO` comment in `contact.astro`.

---

## Content That Needs Updating

| Item | File | Current state |
|------|------|---------------|
| Hero background image | `Hero.astro` | Unsplash photo (replace with real VanHeight photo) |
| Phone number | `Header.astro`, `Footer.astro`, `contact.astro`, `CTA.astro` | `(832) 276-3331` — confirm |
| Email | `Footer.astro`, `contact.astro` | `info@vanheight.com` — confirm |
| Google Reviews URL | `Testimonials.astro` | Placeholder `https://g.page/r/vanheight` |
| Social links | `Footer.astro` | `href="#"` — add real Facebook/Instagram URLs |
| Stats (10+yrs, 500+ projects) | `Hero.astro`, `about.astro` | Placeholder numbers — confirm with client |
| WhyUs image | `WhyUs.astro` | Unsplash photo — replace with real photo |
| About page image | `about.astro` | Unsplash photo — replace with real photo |
| Contact form backend | `contact.astro` | Not connected — wire to Formspree or similar |
| Additions service image | `services/index.astro` | Still using Unsplash — no local image yet |

---

## Pending / Future Work

- [ ] Wire `translations.ts` into all components (currently unused)
- [ ] Connect contact form to Formspree or Resend
- [ ] Add individual service pages (`/services/kitchens`, `/services/bathrooms`, etc.)
- [ ] Add `sitemap.xml` for SEO (`@astrojs/sitemap` integration)
- [ ] Add Google Analytics or similar
- [ ] Deploy to Vercel and connect custom domain
- [ ] Phase 2: Client portal, cost calculators (Next.js or Astro server islands)
