// Shareable cost calculator. A missing fee stays missing. After-hours share is
// recorded and never turned into a rate the pricing pages do not print.
import { estimatePlan, formatUsd } from './cost.mjs';
import { isSponsored } from './spotlight.mjs';
import { formatDate } from './stories.mjs';

export const INDUSTRY_OPTIONS = [
  ['all', 'All industries'],
  ['dental', 'Dental'],
  ['legal', 'Legal'],
  ['plumbing', 'Home services'],
  ['medical', 'Medical'],
];

export const DEFAULT_INPUT = {
  industry: 'all',
  calls: 150,
  minutes: 3,
  afterHours: null,
};

function whole(value, min, max) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function decimal(value, min, max) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

export function parseCalculatorQuery(query = {}) {
  const industry = INDUSTRY_OPTIONS.some(([id]) => id === query.industry)
    ? query.industry
    : DEFAULT_INPUT.industry;
  return {
    industry,
    calls: whole(query.calls, 0, 100000) ?? DEFAULT_INPUT.calls,
    minutes: decimal(query.minutes ?? query.mins, 0, 240) ?? DEFAULT_INPUT.minutes,
    afterHours: whole(query.after, 0, 100),
  };
}

export function calculatorPath(input) {
  const params = new URLSearchParams();
  if (input.industry && input.industry !== 'all') params.set('industry', input.industry);
  params.set('calls', String(input.calls));
  params.set('minutes', String(input.minutes));
  if (input.afterHours != null) params.set('after', String(input.afterHours));
  return `/cost/calculator/?${params.toString()}`;
}

function setupLabel(plan) {
  if (plan.setupFee == null) return 'Not verified';
  if (plan.setupFee === 0) return 'No setup fee on the pricing page';
  return `${formatUsd(Math.round(plan.setupFee * 100))} one time`;
}

function sourceOf(model, vendor) {
  const source = model?.sources?.[0] || null;
  const vendorSource = vendor.sources?.[0] || '';
  return {
    href: source?.href || vendorSource || '',
    label: source?.label || (vendorSource ? 'Price source' : 'No source URL'),
    checked: model ? null : vendor.last_checked || '',
  };
}

function excludedRow(vendor, reason, model, checked) {
  const source = sourceOf(model, vendor);
  const checkedOn = model ? checked : (vendor.last_checked || '');
  return {
    slug: vendor.slug,
    name: vendor.name,
    sponsored: isSponsored(vendor),
    included: false,
    reason,
    planName: '',
    monthlyCents: null,
    yearCents: null,
    monthly: 'Not enough public pricing',
    year: 'Not enough public pricing',
    setup: '',
    formula: '',
    unknowns: [],
    sourceHref: source.href,
    sourceLabel: source.label,
    checked: checkedOn,
    checkedLabel: checkedOn ? formatDate(checkedOn) : '',
    lowest: false,
  };
}

function priceVendor(vendor, model, input, checked) {
  if (!model) {
    return excludedRow(vendor, 'Not enough public pricing. No published allowance and overage for this call count.', null, checked);
  }
  if (model.unit === 'customer') {
    return excludedRow(
      vendor,
      'Not enough public pricing. This vendor bills unique callers, and calls are not converted into customers.',
      model,
      checked,
    );
  }
  const planInput = {
    calls: input.calls,
    durationMinutes: model.unit === 'minute' ? input.minutes : '',
  };
  const complete = (model.plans || [])
    .map((plan) => ({
      plan,
      estimate: estimatePlan({ ...plan, unit: plan.unit || model.unit }, planInput),
    }))
    .filter((row) => row.estimate.status === 'estimate' && row.estimate.scenarioCents != null);
  if (!complete.length) {
    return excludedRow(
      vendor,
      'Not enough public pricing. The published cards do not give a complete monthly total at this call count.',
      model,
      checked,
    );
  }
  complete.sort((a, b) => a.estimate.scenarioCents - b.estimate.scenarioCents || a.plan.name.localeCompare(b.plan.name));
  const chosen = complete[0];
  const monthlyCents = chosen.estimate.scenarioCents;
  const yearKnown = chosen.estimate.oneTimeKnown === true && chosen.estimate.oneTimeCents != null;
  const yearCents = yearKnown ? monthlyCents * 12 + chosen.estimate.oneTimeCents : null;
  const source = model.sources?.[0];
  return {
    slug: vendor.slug,
    name: vendor.name,
    sponsored: isSponsored(vendor),
    included: true,
    reason: yearKnown ? '' : 'The setup fee is not published, so the first-year total is not enough public pricing. It is not treated as zero.',
    planName: chosen.plan.name,
    published: chosen.plan.publishedLabel,
    monthlyCents,
    yearCents,
    monthly: formatUsd(monthlyCents),
    year: yearKnown ? formatUsd(yearCents) : 'Not enough public pricing',
    setup: setupLabel(chosen.plan),
    formula: chosen.estimate.formula,
    unknowns: model.caveats || [],
    sourceHref: source?.href || '',
    sourceLabel: source?.label || 'Pricing page',
    checked,
    checkedLabel: formatDate(checked),
    lowest: false,
  };
}

export function quoteDirectory(vendors, models, input) {
  const pool = input.industry === 'all'
    ? vendors
    : vendors.filter((vendor) => (vendor.industries || []).includes(input.industry));
  const rows = pool.map((vendor) => {
    const model = (models.providers || []).find((provider) => provider.slug === vendor.slug) || null;
    return priceVendor(vendor, model, input, models.checked);
  });
  const priced = rows.filter((row) => row.included);
  const missing = rows.filter((row) => !row.included).sort((a, b) => a.name.localeCompare(b.name));
  priced.sort((a, b) => {
    const rank = (row) => (row.yearCents == null ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.yearCents != null && b.yearCents != null && a.yearCents !== b.yearCents) return a.yearCents - b.yearCents;
    return a.name.localeCompare(b.name);
  });
  if (priced[0]?.yearCents != null) priced[0].lowest = true;
  const assumptions = [
    `Minute-billed plans use ${input.minutes} minutes as the average call. Partial minutes are not rounded up.`,
    'Per-call plans ignore call length.',
    input.afterHours == null
      ? 'After-hours share is blank. No pricing page in this directory publishes a separate after-hours rate, so none is added.'
      : `After-hours share is ${input.afterHours}% of calls. No pricing page in this directory publishes a separate after-hours rate, so that share is not priced.`,
    'The first year is 12 times the monthly card plus a published setup fee. A setup fee that is not printed is not treated as zero. Annual discounts that are mentioned but not printed are not applied.',
    'One row per vendor uses the lowest complete monthly estimate among that vendor’s published plans. Sponsored listings do not change the order.',
    `The cost model was checked ${formatDate(models.checked)}.`,
  ];
  return { input, priced, missing, assumptions, checked: models.checked };
}

export function quoteSummary(quote) {
  const withYear = quote.priced.filter((row) => row.yearCents != null).length;
  const monthlyOnly = quote.priced.length - withYear;
  return `${withYear} ${withYear === 1 ? 'vendor has' : 'vendors have'} a monthly estimate and a published setup fee. ${monthlyOnly} ${monthlyOnly === 1 ? 'has' : 'have'} a monthly estimate, and the setup fee is not published. ${quote.missing.length} say not enough public pricing.`;
}
