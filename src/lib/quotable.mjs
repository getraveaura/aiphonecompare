// Quotable, dated answers and "Key findings" for the pages AI assistants and
// search snippets read first. Every number is counted from src/data at build
// time (vendors.json, price-plans.json, cost-models.json, price-changes.json).
// Nothing here estimates a price that a company does not publish.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { priceStatus, money, latestChecked } from './starting-price.mjs';
import { estimatePlan } from './cost.mjs';
import { formatDate } from './stories.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', file), 'utf8'));
const VENDORS = read('vendors.json');
const PLANS = read('price-plans.json');
const MODELS = read('cost-models.json');
const LOG = read('price-changes.json');

export const SITE_NAME = 'aiphonecompare';
export const EXAMPLE_CALLS = 150;
export const EXAMPLE_MINUTES = 3;

// Developer voice platforms: you build and run the agent yourself. They are
// left out of "small-business plan" examples so a do-it-yourself API price is
// not shown as what a business owner would pay for a ready-made receptionist.
export const SELF_BUILD = new Set(['bland-ai', 'elevenlabs-ai-receptionist']);

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function usdCents(cents) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars.toLocaleString('en-US')}` : `$${dollars.toFixed(2)}`;
}

// Middle value of a sorted list. For an even count we report the lower middle
// price, so the figure is always a real published price, never an average.
export function lowerMedian(sorted) {
  if (!sorted.length) return null;
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

// Starting prices that count (standalone monthly plan, read on the company's own site).
export function countedPrices(list = VENDORS, plans = PLANS) {
  return list
    .map((vendor) => ({ vendor, status: priceStatus(vendor, plans) }))
    .filter((row) => row.status.counted && row.status.amount != null)
    .sort((a, b) => a.status.amount - b.status.amount || a.vendor.name.localeCompare(b.vendor.name));
}

function providerChecked(provider, models) {
  return provider.checked || models.checked || '';
}

// Format a set of ISO dates as "6 November 2026", or "6–20 November 2026"
// when they fall in the same month, otherwise "6 November 2026 to 20 December 2026".
export function formatCheckedSpan(dates) {
  const unique = [...new Set((dates || []).filter(Boolean))].sort();
  if (!unique.length) return '';
  if (unique[0] === unique.at(-1)) return formatDate(unique[0]);
  const last = formatDate(unique.at(-1));
  const [year1, month1] = unique[0].split('-');
  const [year2, month2] = unique.at(-1).split('-');
  if (year1 === year2 && month1 === month2) {
    return `${Number(unique[0].slice(8, 10))}–${last}`;
  }
  return `${formatDate(unique[0])} to ${last}`;
}

function bestPlanRows(providers, calls, models) {
  const out = [];
  for (const provider of providers) {
    let best = null;
    for (const plan of provider.plans) {
      const est = estimatePlan({ ...plan, unit: plan.unit || provider.unit }, { calls, durationMinutes: EXAMPLE_MINUTES });
      if (est.status !== 'estimate' || est.scenarioCents == null) continue;
      if (!best || est.scenarioCents < best.cents) {
        best = {
          provider: provider.name,
          slug: provider.slug,
          plan: plan.name,
          cents: est.scenarioCents,
          checked: providerChecked(provider, models),
          unit: plan.unit || provider.unit,
          addonOnly: Boolean(provider.addonOnly),
        };
      }
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => a.cents - b.cents);
}

function providersFor(slugs, models, { addonOnly } = {}) {
  const wanted = slugs ? new Set(slugs) : null;
  return models.providers.filter((provider) => {
    if (SELF_BUILD.has(provider.slug) || provider.productKind === 'platform') return false;
    if (provider.productKind === 'live') return false;
    if (Boolean(provider.addonOnly) || provider.productKind === 'addon') {
      if (!addonOnly) return false;
    } else if (addonOnly) return false;
    if (wanted && !wanted.has(provider.slug)) return false;
    return true;
  });
}

// Cheapest plan per company at a call volume, from companies that publish
// enough to work out a full monthly bill. Self-build platforms and add-on-only
// prices (which sit on top of a software plan we cannot price) are excluded.
export function cheapestAt(slugs = null, calls = EXAMPLE_CALLS, models = MODELS) {
  return bestPlanRows(providersFor(slugs, models, { addonOnly: false }), calls, models);
}

// Monthly add-on estimates, kept separate from complete-plan ranges.
export function addOnAt(slugs = null, calls = EXAMPLE_CALLS, models = MODELS) {
  return bestPlanRows(providersFor(slugs, models, { addonOnly: true }), calls, models);
}

function hasFreeStart(vendor) {
  const text = String(vendor.free_trial || '');
  return /free|trial|\b\d+\s*days?\b/i.test(text) && !/^no\b/i.test(text.trim());
}

function unitWord(row, count) {
  if (row?.unit === 'conversation') return count === 1 ? 'conversation' : 'conversations';
  return count === 1 ? 'call' : 'calls';
}

function addOnFinding(row) {
  const amount = usdCents(row.cents);
  const volume = `${EXAMPLE_CALLS} ${unitWord(row, EXAMPLE_CALLS)}`;
  const checked = row.checked ? ` (checked ${formatDate(row.checked)})` : '';
  if (row.slug === 'jobber-ai-receptionist') {
    return `The ${row.provider} add-on is **${amount}** a month at ${volume}. That is the add-on only: a Jobber software plan is not included, and the yearly price and setup are not published${checked}.`;
  }
  return `The ${row.provider} add-on is **${amount}** a month at ${volume}. That is the add-on only, and the yearly price and setup are not published${checked}.`;
}

// Whole-market figures for the homepage, /cost/ and /price-index/.
export function marketFindings(list = VENDORS, plans = PLANS, models = MODELS, log = LOG) {
  const counted = countedPrices(list, plans);
  const amounts = counted.map((row) => row.status.amount);
  const median = lowerMedian(amounts);
  const under = (cap) => amounts.filter((n) => n <= cap).length;
  const sb = cheapestAt(null, EXAMPLE_CALLS, models);
  const addons = addOnAt(null, EXAMPLE_CALLS, models);
  return {
    latest: latestChecked(list),
    modelsChecked: formatCheckedSpan(sb.map((row) => row.checked)),
    listed: list.length,
    counted: counted.length,
    median,
    lowest: counted[0] || null,
    highest: counted.at(-1) || null,
    under50: under(50),
    under100: under(100),
    under200: under(200),
    sb,
    sbLow: sb[0] || null,
    sbHigh: sb.at(-1) || null,
    addons,
    changes: (log?.changes || []).length,
    trackingStarted: log?.trackingStarted || '',
  };
}

export function sbRangeText(f) {
  if (!f.sbLow) return '';
  if (f.sb.length === 1) return `${usdCents(f.sbLow.cents)}/mo (${f.sbLow.provider} ${f.sbLow.plan})`;
  return `${usdCents(f.sbLow.cents)} to ${usdCents(f.sbHigh.cents)} a month`;
}

// One dated sentence with a number, for the top of a page.
export function marketAnswer(f = marketFindings()) {
  const date = formatDate(f.latest);
  return `As of ${date}, **half start at ${money(f.median)}/mo or less** and **${f.under50} start at $50/mo or less**, counting the ${f.counted} services that publish a standard monthly price on their own website.`;
}

export function costAnswer(f = marketFindings()) {
  const date = f.modelsChecked || formatDate(f.latest);
  const range = sbRangeText(f);
  const bills = range
    ? `ready-made AI plans with a complete published price come to **${range}** at ${EXAMPLE_CALLS} calls a month. Live receptionist plans are not in that range. `
    : '';
  return `As of ${date}, ${bills}Half of the ${f.counted} services with a standard monthly price start at **${money(f.median)}/mo or less**, and **${f.under50} start at $50/mo or less**.`;
}

// Plainer of the two meta options in the 22 November 2026 brief, trimmed to 160 characters.
export function costDescription() {
  return 'What an AI receptionist costs per month, with setup and extra-use charges. Every figure is from the company\'s pricing page, with the date we checked it.';
}

export function costLlmsBlurb(f = marketFindings()) {
  const range = sbRangeText(f);
  return `AI receptionist cost: half of the ${f.counted} services with a standard monthly price start at ${money(f.median)}/mo or less. At ${EXAMPLE_CALLS} calls a month (${EXAMPLE_MINUTES} minutes), ready-made AI plans with a complete published price run ${range}. Live receptionist plans, including Ruby, are not in that range. A total that adds printed extra use is our calculation from those printed rates.`;
}

export function bestLlmsBlurb() {
  return 'Best AI phone receptionists: an independent shortlist by situation (budget, repeat callers, a person who can take over, your industry, or a platform you build). Published starting prices, no paid rank, and no numbered score.';
}

export function marketFindingsList(f = marketFindings(), { includeBills = true } = {}) {
  const out = [
    `**${f.counted} of ${f.listed}** services we track publish a standard monthly plan price on their own website.`,
    `The middle starting price is **${money(f.median)}/mo**: half start at or below it.`,
    `**${f.under50}** start at $50/mo or less, and **${f.under100}** at $100/mo or less.`,
  ];
  if (includeBills && f.sbLow) {
    const checked = f.modelsChecked ? `; plan prices checked ${f.modelsChecked}` : '';
    out.push(`At ${EXAMPLE_CALLS} calls a month (${EXAMPLE_MINUTES} minutes each), the cheapest complete plan from each ready-made AI service with fully published pricing is **${sbRangeText(f)}** (${f.sb.map((r) => r.provider).join(', ')}${checked}). Live receptionist plans are not in that range.`);
  }
  for (const row of f.addons || []) out.push(addOnFinding(row));
  if (f.trackingStarted) out.push(`**${plural(f.changes, 'price change')}** logged since ${formatDate(f.trackingStarted)}.`);
  return out;
}

// Industry figures for a /best/ guide's vendor list.
export function industryFindings(vendors, plans = PLANS, models = MODELS, { listChecked } = {}) {
  const counted = countedPrices(vendors, plans);
  const amounts = counted.map((row) => row.status.amount);
  const slugs = vendors.map((v) => v.slug);
  const sb = cheapestAt(slugs, EXAMPLE_CALLS, models);
  const addons = addOnAt(slugs, EXAMPLE_CALLS, models);
  const latest = [latestChecked(vendors), listChecked].filter(Boolean).sort().at(-1) || '';
  return {
    listed: vendors.length,
    counted: counted.length,
    lowest: counted[0] || null,
    highest: counted.at(-1) || null,
    under100: amounts.filter((n) => n <= 100).length,
    median: lowerMedian(amounts),
    freeStart: vendors.filter(hasFreeStart),
    handoff: vendors.filter((v) => String(v.human_handoff || '').trim()).length,
    sb,
    sbLow: sb[0] || null,
    addons,
    modelsChecked: formatCheckedSpan(sb.map((row) => row.checked)),
    latest,
  };
}

// audience: "chiropractic offices"; singular: "a chiropractic office".
export function industryAnswer(f, { audience, own = true }) {
  if (!f.listed) return '';
  const date = formatDate(f.latest);
  const verb = own
    ? (f.listed === 1 ? 'has its own page for' : 'have their own page for')
    : (f.listed === 1 ? 'is listed for' : 'are listed for');
  const parts = [`As of ${date}, **${plural(f.listed, 'AI receptionist')}** ${verb} ${audience}.`];
  if (f.lowest && f.highest && f.counted > 1) {
    parts.push(`Published starting prices run from **${f.lowest.status.display}** (${f.lowest.vendor.name}) to **${f.highest.status.display}** (${f.highest.vendor.name}), and ${f.under100} of ${f.counted} start at $100/mo or less.`);
  } else if (f.lowest) {
    parts.push(`The only published starting price is **${f.lowest.status.display}** (${f.lowest.vendor.name}).`);
  }
  if (f.sbLow) {
    parts.push(`For a busier business taking ${EXAMPLE_CALLS} calls a month, the cheapest complete plan we can price is **${usdCents(f.sbLow.cents)}/mo** (${f.sbLow.provider} ${f.sbLow.plan}).`);
  }
  return parts.join(' ');
}

export function industryFindingsList(f, { audience, own = true }) {
  const out = [];
  const priced = f.counted === 0
    ? `; ${f.listed === 1 ? 'it does not publish' : 'none publish'} a monthly price on ${f.listed === 1 ? 'its' : 'their'} own website`
    : f.counted < f.listed ? `; **${f.counted}** publish a monthly starting price on their own website` : '';
  out.push(own
    ? `**${f.listed}** ${f.listed === 1 ? 'service has its' : 'services have their'} own page for ${audience}${priced}.`
    : `**${f.listed}** ${f.listed === 1 ? 'service is' : 'services are'} listed for ${audience} in our directory${priced}.`);
  if (f.lowest && f.counted > 1) out.push(`Lowest published starting price: **${f.lowest.status.display}** (${f.lowest.vendor.name}). Highest: **${f.highest.status.display}** (${f.highest.vendor.name}).`);
  if (f.median != null && f.counted > 2) out.push(`The middle starting price is **${money(f.median)}/mo**, and **${f.under100} of ${f.counted}** start at $100/mo or less.`);
  if (f.freeStart.length) out.push(`**${f.freeStart.length} of ${f.listed}** list a free trial, free calls or a free period, so you can test before you pay.`);
  if (f.sbLow) {
    const checked = f.modelsChecked ? `; plan prices checked ${f.modelsChecked}` : '';
    out.push(`At ${EXAMPLE_CALLS} calls a month (${EXAMPLE_MINUTES} minutes each), the cheapest complete plan we can price is **${usdCents(f.sbLow.cents)}/mo** (${f.sbLow.provider} ${f.sbLow.plan}${checked}).`);
  }
  for (const row of f.addons || []) out.push(addOnFinding(row));
  return out;
}

// "How to cite this page" line.
export function citeText({ title, url, date }) {
  return `${SITE_NAME}, "${title}", updated ${date ? formatDate(date) : 'date not recorded'}, ${url}`;
}

// All dollar figures a page built from these findings may show.
export function findingDollars(f) {
  const out = [];
  for (const row of [f.lowest, f.highest]) if (row) out.push(row.status.display);
  if (f.median != null) out.push(`${money(f.median)}/mo`);
  for (const r of f.sb || []) out.push(`${usdCents(r.cents)}/mo`, usdCents(r.cents));
  for (const r of f.addons || []) out.push(`${usdCents(r.cents)}/mo`, usdCents(r.cents));
  out.push('$50/mo', '$100/mo');
  return out.join(' ');
}
