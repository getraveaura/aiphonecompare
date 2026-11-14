// Homepage "Starting prices, straight from each company": only vendors whose
// starting price is published on their own website (a cited source on the
// vendor's own domain), not "Not published", not reported by a third party,
// and not a site that is offline. Vendors with structured plan cards come
// first; the rest fill in. Each group is A to Z.
import { planEntry } from './plans.mjs';

const host = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};

export function ownSitePrice(vendor) {
  const price = String(vendor?.starting_price || '').trim();
  if (!price) return false;
  if (/^(not published|not verified|not stated|reported\b)|~|\bper [A-Z][a-z]+\)|\(per /i.test(price)) return false;
  if (vendor?.site_status?.status === 'offline') return false;
  const own = host(vendor.website);
  if (!own) return false;
  return (vendor.sources || []).some((s) => { const h = host(s); return h === own || h.endsWith(`.${own}`); });
}

export function homePicks(vendors, plansData, n = 5) {
  const eligible = vendors.filter(ownSitePrice).sort((a, b) => a.name.localeCompare(b.name));
  const structured = eligible.filter((v) => planEntry(v, plansData));
  const rest = eligible.filter((v) => !planEntry(v, plansData));
  return [...structured, ...rest].slice(0, n);
}
