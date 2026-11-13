// Builders for robots.txt and sitemap lastmod. Pure functions, no I/O.

export const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'Google-Extended', 'Applebot-Extended', 'Bingbot',
  'DuckAssistBot', 'MistralAI-User', 'CCBot', 'Meta-ExternalAgent',
];

export function renderRobots(bots = AI_BOTS, site = 'https://aiphonecompare.com') {
  return `User-agent: *\nAllow: /\n\n${bots.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n')}\nSitemap: ${site}/sitemap.xml\n`;
}

// YYYY-MM-DD from a YYYY-MM-DD or full ISO 8601 string, or '' when invalid.
export function toDay(value) {
  const s = String(value ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!m) return '';
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}`) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function metaModified(html) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (!/\bproperty=["']article:modified_time["']/i.test(tag)) continue;
    const c = tag.match(/\bcontent=["']([^"']*)["']/i);
    const day = c && toDay(c[1]);
    if (day) return day;
  }
  return '';
}

function collectDateModified(node, out) {
  if (Array.isArray(node)) node.forEach((n) => collectDateModified(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'dateModified') {
        const day = toDay(v);
        if (day) out.push(day);
      } else collectDateModified(v, out);
    }
  }
}

function jsonldModified(html) {
  const days = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { collectDateModified(JSON.parse(m[1]), days); } catch { /* invalid blocks fail the build elsewhere */ }
  }
  return days.sort().at(-1) || '';
}

// lastmod for a built HTML page: article:modified_time meta, else the newest
// JSON-LD dateModified, else the fallback.
export function pickLastmod(html, fallback) {
  return metaModified(html) || jsonldModified(html) || toDay(fallback) || fallback;
}
