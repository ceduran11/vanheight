// Converts World Cup 2026 match kickoff times to the viewer's own browser
// timezone — no IP lookups, no external geolocation service. The browser
// already knows its timezone (Intl.DateTimeFormat / Date), which is at
// least as accurate as guessing from an IP and has no privacy cost.

// worldcup26.ir only gives wall-clock "local_date" + the host city, no UTC
// offset — so each city needs to be mapped to its real IANA timezone (DST
// is handled automatically by Intl for whatever date we're converting).
const CITY_TIMEZONE = {
  "Mexico City": "America/Mexico_City",
  "Guadalajara (Zapopan)": "America/Mexico_City",
  "Monterrey (Guadalupe)": "America/Mexico_City",
  Toronto: "America/Toronto",
  Vancouver: "America/Vancouver",
  Atlanta: "America/New_York",
  "Boston (Foxborough)": "America/New_York",
  "Dallas (Arlington)": "America/Chicago",
  "Dallas (Arlington, Texas)": "America/Chicago",
  Houston: "America/Chicago",
  "Kansas City": "America/Chicago",
  "Los Angeles (Inglewood)": "America/Los_Angeles",
  "Miami (Miami Gardens)": "America/New_York",
  "New York/New Jersey (East Rutherford)": "America/New_York",
  Philadelphia: "America/New_York",
  "San Francisco Bay Area (Santa Clara)": "America/Los_Angeles",
  Seattle: "America/Los_Angeles",
};

export function timeZoneForCity(cityEn) {
  return CITY_TIMEZONE[cityEn] || "America/New_York";
}

function tzOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUTC - date.getTime()) / 60000;
}

// Converts a wall-clock date/time that's local to `timeZone` (e.g. "13:00
// in America/Chicago") into the actual UTC instant.
export function zonedWallTimeToUtc(year, month, day, hour, minute, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMin = tzOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offsetMin * 60000);
}

// Converts a wall-clock date/time that already has an explicit fixed UTC
// offset in hours (e.g. openfootball's "UTC-6") into the actual UTC instant.
export function fixedOffsetWallTimeToUtc(year, month, day, hour, minute, offsetHours) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 3600000);
}

// Formats a real UTC Date in whatever timezone the visitor's own browser is
// set to — this is the actual "convert to the user's local time" step.
export function formatLocalKickoff(date) {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString("es-ES", { hour: "numeric", minute: "2-digit", hour12: true });
}
