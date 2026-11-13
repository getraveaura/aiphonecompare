// Industry spotlight: a paid, labeled top spot on ONE industry page for a
// fixed date range. Pure helpers, no I/O.
//
// Vendor field (optional):
//   "spotlight": { "industry": "dental", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD",
//                  "line": "optional short text", "href": "optional https url" }
//
// The legacy boolean `sponsored` is still accepted in vendors.json but no longer
// moves a vendor or adds a label. Only an active spotlight does.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

// Build date, injected by Vite (astro.config.mjs) so pages and browser scripts
// agree with each other. Falls back to today's UTC date in Node tests.
/* global __APC_BUILD_DATE__ */
export const BUILD_DATE = typeof __APC_BUILD_DATE__ === 'string' && DATE.test(__APC_BUILD_DATE__)
  ? __APC_BUILD_DATE__
  : utcToday();

function validSpotlight(spot) {
  return Boolean(
    spot
    && typeof spot === 'object'
    && typeof spot.industry === 'string'
    && spot.industry
    && DATE.test(spot.start || '')
    && DATE.test(spot.end || '')
    && spot.start <= spot.end,
  );
}

// True only when the spotlight is for this industry key and today is within
// start..end inclusive. Dates are YYYY-MM-DD strings, so string compare works.
export function activeSpotlight(vendor, industry, today = BUILD_DATE) {
  const spot = vendor?.spotlight;
  if (!validSpotlight(spot) || !industry || spot.industry !== industry) return false;
  return spot.start <= today && today <= spot.end;
}

// True when the vendor has an active spotlight on any industry page.
export function isSponsored(vendor, today = BUILD_DATE) {
  const spot = vendor?.spotlight;
  return validSpotlight(spot) && activeSpotlight(vendor, spot.industry, today);
}

// Industry page order: the vendor with an active spotlight for THIS industry
// first, then everyone else alphabetically. If two spotlights overlap by mistake,
// both go first, alphabetically.
export function orderForIndustry(vendors, industry, today = BUILD_DATE) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  const pool = vendors.filter((v) => (v.industries || []).includes(industry));
  const top = pool.filter((v) => activeSpotlight(v, industry, today)).sort(byName);
  const rest = pool.filter((v) => !activeSpotlight(v, industry, today)).sort(byName);
  return [...top, ...rest];
}

// Badge rule for a table. On an industry page, only that page's spotlight is
// labeled. Elsewhere, any active spotlight is labeled.
export function sponsoredLabel(vendor, industry = '', today = BUILD_DATE) {
  return industry ? activeSpotlight(vendor, industry, today) : isSponsored(vendor, today);
}
