// One rule for "what does this AI receptionist start at per month", shared by
// the alternatives pages and the "best under $X" pages. Pure functions.
//
// Nothing here estimates a price. The amount is read from the vendor's own
// starting_price text (or its structured price-plans.json entry, which must
// match that text word for word). A price counts as published only when the
// latest price check read it on the vendor's own site.
import { lowestMonthly } from './price.mjs';
import { planEntry } from './plans.mjs';

// price_check results that mean "read on the vendor's own page today".
const OWN_SITE = new Set(['confirmed', 'changed']);

export const KIND = {
  monthly: 'monthly', // a plan with a monthly fee you can buy on its own
  addon: 'addon', // an add-on that needs another paid plan
  perSeat: 'per-seat', // priced per user or seat
  aiNotPublished: 'ai-not-published', // dollar figure is for a base plan, not the AI receptionist
  noMonthly: 'no-monthly', // a published price, but no monthly plan fee in it
  notPublished: 'not-published', // no price on the vendor's own site
};

export const REASONS = {
  [KIND.addon]: 'An add-on that needs another paid plan from the same company. That plan is not included in this price.',
  [KIND.perSeat]: 'Priced per user or seat, so the monthly bill depends on team size.',
  [KIND.aiNotPublished]: 'The dollar figure is for the base plan. The AI receptionist’s own price is not published.',
  [KIND.noMonthly]: 'Priced per minute or per call, with no monthly plan fee stated.',
  notPublishedThirdParty: 'The figure on file comes from another website, not the company’s own pricing page, so it is not counted.',
  notPublishedNone: 'No price on the company’s own website.',
};

// Short labels for compact rows, where the group heading already explains the rule.
export const SHORT_REASONS = {
  [KIND.addon]: 'Add-on: needs another paid plan',
  [KIND.perSeat]: 'Priced per user or seat',
  [KIND.aiNotPublished]: 'AI receptionist price not published',
  [KIND.noMonthly]: 'No monthly plan fee stated',
  notPublishedThirdParty: 'Price only seen on another website',
  notPublishedNone: 'No price on its own website',
};

// Positive monthly amount from a structured entry's "from" ("$79/mo" only),
// else the lowest positive monthly amount written in the text. "$0" plans
// (free tiers, pay-as-you-go) are not a starting price.
function positiveMonthly(vendor, plans) {
  const entry = plans ? planEntry(vendor, plans) : null;
  const from = entry?.from?.match(/^\$([\d,]+(?:\.\d+)?)\/mo$/);
  if (from) {
    const n = Number(from[1].replace(/,/g, ''));
    if (n > 0) return n;
  }
  const text = String(vendor.starting_price || '').replace(/(?<![\w.])\$0(?![\d.,])/g, '');
  const n = lowestMonthly(text);
  return n != null && n > 0 ? n : null;
}

export function publishedOnOwnSite(vendor) {
  return OWN_SITE.has(vendor?.price_check?.result) && /\$\d/.test(vendor?.starting_price || '');
}

// { kind, amount, counted, reason, display }
// amount: the monthly dollar figure read from the text (null when none).
// counted: true only for a standalone monthly plan published on the vendor's own site.
export function priceStatus(vendor, plans) {
  const text = String(vendor?.starting_price || '').trim();
  const billing = String(vendor?.billing_model || '');
  const hasDollar = /\$\d/.test(text);
  const amount = hasDollar ? positiveMonthly(vendor, plans) : null;
  if (!publishedOnOwnSite(vendor)) {
    return {
      kind: KIND.notPublished,
      amount: hasDollar ? lowestMonthly(text) : null,
      counted: false,
      reason: hasDollar ? REASONS.notPublishedThirdParty : REASONS.notPublishedNone,
      short: hasDollar ? SHORT_REASONS.notPublishedThirdParty : SHORT_REASONS.notPublishedNone,
      display: 'Not published',
    };
  }
  let kind = KIND.monthly;
  if (/add-on|on top of/i.test(`${text} ${billing}`)) kind = KIND.addon;
  else if (/its own price is not published/i.test(text)) kind = KIND.aiNotPublished;
  else if (/\/\s*user\b|per user|per seat|\/\s*seat\b/i.test(text)) kind = KIND.perSeat;
  else if (amount == null) kind = KIND.noMonthly;
  return {
    kind,
    amount,
    counted: kind === KIND.monthly,
    reason: kind === KIND.monthly ? '' : REASONS[kind],
    short: kind === KIND.monthly ? '' : SHORT_REASONS[kind],
    display: amount != null ? `${money(amount)}/mo` : 'See listing',
  };
}

export function money(n) {
  if (n == null) return '';
  const [whole, frac] = String(n).split('.');
  return `$${Number(whole).toLocaleString('en-US')}${frac ? `.${frac.padEnd(2, '0')}` : ''}`;
}

// Price ascending, ties alphabetical. Sponsorship never enters the sort.
export function byAmountThenName(a, b) {
  const an = a.status.amount;
  const bn = b.status.amount;
  if (an == null && bn != null) return 1;
  if (bn == null && an != null) return -1;
  if (an != null && bn != null && an !== bn) return an - bn;
  return a.vendor.name.localeCompare(b.vendor.name);
}

export function latestChecked(vendors) {
  return vendors.map((v) => v.last_checked).filter(Boolean).sort().at(-1) || '';
}
