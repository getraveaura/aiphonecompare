// Answer-first summaries and Article/Product JSON-LD. Pure functions.
// Every sentence is built from fields in src/data (or numbers the cost engine
// computes from them). A missing field drops its clause; nothing is guessed.
import { firstSentence } from './schema.mjs';
import { formatDate } from './stories.mjs';

const trimEnd = (text) => String(text ?? '').trim().replace(/[.;,\s]+$/, '');
const has = (text) => trimEnd(text).length > 0;
const notStated = (text) => !has(text) || /^not stated\b/i.test(String(text).trim());
const INDUSTRY_WORDS = { dental: 'dental practices', legal: 'law firms', plumbing: 'plumbing and home-service businesses', medical: 'medical practices' };
const INDUSTRY_LABEL = { dental: 'dental', legal: 'legal', plumbing: 'plumbing', medical: 'medical' };

function list(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '');
  }
}

export function sourceLinks(urls, max = 3) {
  const seen = {};
  return [...new Set((urls || []).filter((u) => /^https:\/\//.test(u)))].slice(0, max).map((href) => {
    const host = hostLabel(href);
    seen[host] = (seen[host] || 0) + 1;
    return { href, label: seen[host] > 1 ? `${host} (${seen[host]})` : host };
  });
}

// Vendor page: 2–3 sentences from the vendor record and its logged changes.
export function vendorSummary(v, changes = []) {
  const out = [];
  if (has(v.starting_price)) {
    out.push(`${v.name}'s published starting price is ${trimEnd(v.starting_price)}${has(v.billing_model) ? ` (billing: ${trimEnd(v.billing_model).replace(/^./, (c) => c.toLowerCase())})` : ''}.`);
  } else {
    out.push(`No starting price is verified for ${v.name} in this directory${has(v.billing_model) ? `; its billing is recorded as ${trimEnd(v.billing_model).replace(/^./, (c) => c.toLowerCase())}` : ''}.`);
  }
  const parts = [];
  parts.push(has(v.free_trial) ? `free trial: ${trimEnd(v.free_trial)}` : 'free trial: not verified');
  parts.push(has(v.human_handoff) ? `human handoff: ${trimEnd(v.human_handoff)}` : 'human handoff: not verified');
  parts.push(notStated(v.hipaa_baa) ? 'HIPAA/BAA: not stated' : `HIPAA/BAA: ${trimEnd(v.hipaa_baa)}`);
  out.push(`On record, ${parts.join('; ')}.`);
  const mine = changes.filter((c) => c.vendorSlug === v.slug).sort((a, b) => String(b.observed).localeCompare(String(a.observed)));
  if (mine.length) {
    out.push(`Price change logged ${formatDate(mine[0].observed)}: ${firstSentence(mine[0].summary)}`);
  } else if ((v.industries || []).length) {
    out.push(`Listed on aiphonecompare for ${list(v.industries.map((k) => INDUSTRY_LABEL[k] || k))}.`);
  }
  return out;
}

// Industry page: listing count, lowest written monthly amount, BAA/handoff count.
export function industrySummary({ key, vendors, priceSentence }) {
  const n = vendors.length;
  const out = [`aiphonecompare lists ${n} AI receptionist${n === 1 ? '' : 's'} for ${INDUSTRY_WORDS[key] || key}. ${priceSentence}`];
  if (key === 'dental' || key === 'medical') {
    const stated = vendors.filter((v) => !notStated(v.hipaa_baa)).length;
    out.push(`${stated} of ${n} listings record a HIPAA or BAA statement; for the other ${n - stated}, none is stated on the pages we checked.`);
  } else {
    const filled = vendors.filter((v) => has(v.human_handoff)).length;
    out.push(`${filled} of ${n} listings describe how a call reaches a person (a transfer or live staff); for the other ${n - filled}, that is not verified.`);
  }
  return out;
}

// Landing pages (compare / cost). `rangeAt` returns the cost engine's
// sentence for a call volume, or '' when the page has no cost rows.
const NOT_RANKING = / ?That is the math on the published cards, not a ranking\./g;
const CARDS_NOTE = 'Figures are math on the published plan cards, not a ranking.';

export function compareSummary({ left, right, providers = [], rangeAt }) {
  const billing = (v) => (has(v.billing_model) ? ` (${trimEnd(v.billing_model).replace(/^./, (c) => c.toLowerCase())})` : '');
  const price = (v, short) => (has(v.starting_price) ? `${v.name}'s${short ? '' : ' recorded starting price'} is ${trimEnd(v.starting_price)}${billing(v)}` : `${v.name} has no verified starting price`);
  const out = [`${price(left)}. ${has(right.starting_price) && has(left.starting_price) ? price(right, true) : price(right)}.`];
  const inModel = providers.map((p) => p.slug);
  const customer = providers.filter((p) => p.unit === 'customer').map((p) => p.name);
  const priced = providers.filter((p) => p.unit !== 'customer');
  const missing = [left, right].filter((v) => !inModel.includes(v.slug)).map((v) => v.name);
  const range = priced.length && rangeAt ? rangeAt(150).replace(NOT_RANKING, '') : '';
  if (range) out.push(`${range} ${CARDS_NOTE}`);
  for (const name of customer) out.push(`${name} bills unique callers, so a call count is not turned into a ${name} bill.`);
  if (missing.length === 2) out.push('Neither is in our cost model yet, so no monthly bill is calculated from call count.');
  else if (missing.length === 1) out.push(`${missing[0]} is not in our cost model yet, so it has no calculated bill${range ? ' at a call volume' : ''}.`);
  return out;
}

export function vendorCostSummary({ provider, rangeAt }) {
  const unit = provider.unit === 'customer' ? 'unique caller' : provider.unit;
  const priced = provider.plans.filter((p) => typeof p.publishedMonthly === 'number').length;
  const out = [`${provider.name} bills per ${unit}, with ${priced} published monthly plan${priced === 1 ? '' : 's'} on its own pricing page.`];
  const a = rangeAt(50).replace(NOT_RANKING, '');
  const b = rangeAt(150).replace(NOT_RANKING, '');
  if (a) out.push(a);
  if (b) out.push(`${b} ${CARDS_NOTE}`);
  return out;
}

// Article node. dateModified is the page's verified date. Nothing else is dated.
export function articleNode({ url, headline, description, modified, published, citations = [], site = 'https://aiphonecompare.com/' }) {
  const org = { '@id': `${site.replace(/\/$/, '')}/#organization` };
  const node = {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: String(headline).slice(0, 110),
    description,
    mainEntityOfPage: url,
    author: org,
    publisher: org,
    inLanguage: 'en-US',
  };
  if (published) node.datePublished = published;
  if (modified) node.dateModified = modified;
  const cites = [...new Set(citations.filter((u) => /^https:\/\//.test(u)))];
  if (cites.length) node.citation = cites;
  return node;
}

// Product + AggregateOffer only from a vendor's own published plan cards in
// cost-models.json (numeric publishedMonthly). Returns null otherwise.
export function productNode({ vendor, provider, checked, url }) {
  if (!provider) return null;
  const nums = provider.plans.map((p) => p.publishedMonthly).filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!nums.length) return null;
  const source = provider.sources?.[0]?.href;
  const offer = {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: Math.min(...nums),
    highPrice: Math.max(...nums),
    offerCount: nums.length,
    description: `Published monthly plan fees on ${provider.name}'s pricing page, checked ${checked}. Usage beyond each plan's allowance and setup fees are extra where printed.`,
  };
  if (source) offer.url = source;
  const node = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: vendor.name,
    category: 'AI receptionist software',
    brand: { '@type': 'Brand', name: vendor.name },
    offers: offer,
  };
  if (vendor.website) node.url = vendor.website;
  return node;
}

export function breadcrumbNode(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}
