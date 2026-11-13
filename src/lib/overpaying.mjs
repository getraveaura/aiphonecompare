// "Are you overpaying?" check. Every estimate comes from quoteDirectory in
// calculator.mjs, which prices published plans with estimatePlan in cost.mjs.
// Nothing here adds a price: it only compares what the reader pays with those
// estimates. A missing fee stays missing. Sponsored listings do not move.
import { DEFAULT_INPUT, INDUSTRY_OPTIONS, parseCalculatorQuery, quoteDirectory } from './calculator.mjs';
import { formatUsd } from './cost.mjs';
import { formatDate } from './stories.mjs';

export const SITE_ORIGIN = 'https://aiphonecompare.com';
export const OVERPAYING_PATH = '/overpaying/';
export const MAX_OPTIONS = 5;
export const MAX_MONTHLY_COST = 100000;

const MAX_CALLS = 100000;
const MAX_MINUTES = 240;

function blank(value) {
  return value == null || String(value).trim() === '';
}

function numberIn(value, min, max, integer) {
  if (blank(value)) return null;
  const number = Number(String(value).trim());
  if (!Number.isFinite(number) || number < min || number > max) return null;
  if (integer && !Number.isInteger(number)) return null;
  return number;
}

// Parse a query object or form values. Returns usable input plus a message for
// each field that was filled in and could not be used. A blank cost is not an
// error; it means there is nothing to compare yet.
export function parseOverpayingQuery(query = {}) {
  const base = parseCalculatorQuery({ industry: query.industry, calls: query.calls, minutes: query.minutes });
  const cost = numberIn(query.cost, 0, MAX_MONTHLY_COST, false);
  const errors = {};
  if (!blank(query.cost) && cost == null) {
    errors.cost = `Enter what you pay each month in dollars, from 0 to ${MAX_MONTHLY_COST.toLocaleString('en-US')}.`;
  }
  if (!blank(query.calls) && numberIn(query.calls, 0, MAX_CALLS, true) == null) {
    errors.calls = `Enter a whole number of calls from 0 to ${MAX_CALLS.toLocaleString('en-US')}.`;
  }
  if (!blank(query.minutes) && numberIn(query.minutes, 0, MAX_MINUTES, false) == null) {
    errors.minutes = `Enter an average call length from 0 to ${MAX_MINUTES} minutes.`;
  }
  return {
    input: {
      industry: base.industry,
      cost: cost == null ? null : Math.round(cost * 100) / 100,
      calls: base.calls,
      minutes: base.minutes,
    },
    errors,
  };
}

export function overpayingPath(input) {
  const params = new URLSearchParams();
  if (input.industry && input.industry !== 'all') params.set('industry', input.industry);
  if (input.cost != null) params.set('cost', String(input.cost));
  params.set('calls', String(input.calls ?? DEFAULT_INPUT.calls));
  params.set('minutes', String(input.minutes ?? DEFAULT_INPUT.minutes));
  return `${OVERPAYING_PATH}?${params.toString()}`;
}

export function overpayingUrl(input) {
  return `${SITE_ORIGIN}${overpayingPath(input)}`;
}

export function industryName(id) {
  const found = INDUSTRY_OPTIONS.find(([key]) => key === id);
  return found ? found[1] : 'All industries';
}

export function monthlyCostBucket(cost) {
  if (cost == null || !Number.isFinite(cost)) return 'unknown';
  if (cost < 100) return '<100';
  if (cost < 250) return '100-249';
  if (cost < 500) return '250-499';
  if (cost < 1000) return '500-999';
  return '1000+';
}

function option(row, costCents) {
  const differenceCents = costCents == null ? null : costCents - row.monthlyCents;
  return {
    slug: row.slug,
    name: row.name,
    sponsored: row.sponsored,
    vendorHref: `/vendors/${row.slug}/`,
    planName: row.planName,
    published: row.published || '',
    monthlyCents: row.monthlyCents,
    monthly: row.monthly,
    differenceCents,
    cheaper: differenceCents != null && differenceCents > 0,
    setup: row.setup,
    setupKnown: row.yearCents != null,
    formula: row.formula,
    unknowns: row.unknowns,
    sourceHref: row.sourceHref,
    sourceLabel: row.sourceLabel,
    checked: row.checked,
    checkedLabel: row.checkedLabel,
  };
}

// Compare a monthly cost with every plan the calculator can estimate for this
// industry and volume. State is one of:
//   'needs-cost'  no usable cost yet; options are the lowest estimates
//   'savings'     at least one estimate is under the cost
//   'competitive' estimates exist and none is under the cost
//   'empty'       no plan in this industry can be estimated at this volume
export function checkOverpaying(vendors, models, input) {
  const quote = quoteDirectory(vendors, models, {
    industry: input.industry,
    calls: input.calls,
    minutes: input.minutes,
    afterHours: null,
  });
  const costCents = input.cost == null ? null : Math.round(input.cost * 100);
  const ranked = [...quote.priced].sort(
    (a, b) => a.monthlyCents - b.monthlyCents || a.name.localeCompare(b.name),
  );
  const plans = ranked.map((row) => option(row, costCents));
  const cheaper = costCents == null ? [] : plans.filter((row) => row.cheaper);
  const lowest = plans[0] || null;
  let state = 'needs-cost';
  if (!plans.length) state = 'empty';
  else if (costCents != null) state = cheaper.length ? 'savings' : 'competitive';
  const options = (state === 'savings' ? cheaper : plans).slice(0, MAX_OPTIONS);
  return {
    input,
    state,
    costCents,
    cost: costCents == null ? null : formatUsd(costCents),
    estimatedCount: plans.length,
    cheaperCount: cheaper.length,
    lowest,
    savingsCents: state === 'savings' ? lowest.differenceCents : null,
    savings: state === 'savings' ? formatUsd(lowest.differenceCents) : null,
    options,
    missing: quote.missing.map((row) => ({ slug: row.slug, name: row.name, sponsored: row.sponsored })),
    checked: quote.checked,
    checkedLabel: formatDate(quote.checked),
  };
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

// Headline and one-sentence summary for each state. Positive, plain wording.
export function overpayingCopy(result) {
  const { input } = result;
  const where = input.industry === 'all' ? 'across industries' : `for ${industryName(input.industry).toLowerCase()}`;
  const volume = `${input.calls.toLocaleString('en-US')} calls of about ${input.minutes} min each`;
  if (result.state === 'empty') {
    return {
      heading: 'No published plan to compare yet',
      summary: `None of the plans listed ${where} publish enough pricing to estimate ${volume}. That is a gap in public pricing, not a verdict on what you pay.`,
    };
  }
  if (result.state === 'needs-cost') {
    return {
      heading: 'Add what you pay to compare',
      summary: `${plural(result.estimatedCount, 'plan', 'plans')} ${where} can be estimated from published prices at ${volume}. Enter your monthly cost to see how they compare.`,
    };
  }
  if (result.state === 'savings') {
    return {
      heading: 'You may be able to keep the same coverage for less',
      summary: `${result.cheaperCount} of ${plural(result.estimatedCount, 'verified plan', 'verified plans')} ${where} ${result.cheaperCount === 1 ? 'comes' : 'come'} in under ${result.cost} a month at ${volume}. The lowest estimate is ${result.lowest.monthly}, ${result.savings} less than you pay now.`,
    };
  }
  return {
    heading: 'Good news: your price is already competitive',
    summary: `${result.estimatedCount === 1 ? `The one verified plan ${where} does not come` : `None of the ${result.estimatedCount} verified plans ${where} come`} in under ${result.cost} a month at ${volume}. Here is what the same calls cost on the closest published ${result.estimatedCount === 1 ? 'plan' : 'plans'}.`,
  };
}
