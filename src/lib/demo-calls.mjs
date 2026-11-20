// Lookups for the 19 November 2026 public demo-line tests.
// Copy lives in src/data/demo-calls.json so later rounds can be added there.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/demo-calls.json'), 'utf8'));

export function demoCallsData() {
  return data;
}

export function demoCallFor(slug) {
  return data.calls.find((call) => call.slug === slug) || null;
}

export function demoCallsForSlugs(slugs) {
  const set = new Set(slugs);
  return data.calls.filter((call) => set.has(call.slug));
}

// Later of the vendor's last price check and a demo-call date, for page freshness.
export function pageModified(...dates) {
  return dates.filter(Boolean).sort().at(-1) || '';
}
