import { estimatePlan, formatUsd } from './cost.mjs';
import { isSponsored } from './spotlight.mjs';
import { lowestMonthly } from './price.mjs';

const MUST = ['baa', 'spanish', 'alwaysOn', 'booking', 'human'];

export const MUST_LABEL = {
  baa: 'Signed BAA',
  spanish: 'Spanish',
  alwaysOn: '24/7 answering',
  booking: 'Calendar or job booking',
  human: 'Live human fallback',
};

export function baaState(text) {
  const value = String(text || '').trim();
  if (!value) return 'unknown';
  const no = /no BAA|not HIPAA|does not sign|do not sign|isn't HIPAA|is not HIPAA/i.test(value);
  const yes = /signs a BAA|signed BAA|publishes a BAA|BAA naming/i.test(value);
  if (yes && no) return 'unknown';
  if (no) return 'no';
  if (yes) return 'yes';
  return 'unknown';
}

export function spanishState(vendor) {
  const text = [vendor.notes, vendor.integrations, vendor.starting_price].filter(Boolean).join(' ');
  return /\bSpanish\b/i.test(text) ? 'yes' : 'unknown';
}

export function alwaysOnState(vendor) {
  const text = [vendor.notes, vendor.human_handoff, vendor.starting_price, vendor.free_trial].filter(Boolean).join(' ');
  return /\b24\s*\/\s*7\b|around the clock/i.test(text) ? 'yes' : 'unknown';
}

export function bookingState(vendor, model) {
  const notes = [vendor.notes, vendor.integrations].filter(Boolean).join(' ');
  if (/\bbook/i.test(notes) || /\bcalendar\b/i.test(notes)) return 'yes';
  const booking = model?.booking || '';
  if (/\b(do not|does not|cannot|can't) book/i.test(booking)) return 'no';
  if (booking && /\b(book|schedul|calendar)/i.test(booking) && !/not listed|only/i.test(booking)) return 'yes';
  return 'unknown';
}

export function humanState(text) {
  const value = String(text || '').trim();
  if (!value) return 'unknown';
  if (/^no\b|does not transfer|no handoff|not available/i.test(value)) return 'no';
  return 'yes';
}

export function featureState(vendor, models) {
  const model = (models?.providers || []).find((provider) => provider.slug === vendor.slug);
  return {
    baa: baaState(vendor.hipaa_baa),
    spanish: spanishState(vendor),
    alwaysOn: alwaysOnState(vendor),
    booking: bookingState(vendor, model),
    human: humanState(vendor.human_handoff),
    model,
  };
}

function numeric(value) {
  if (value == null || String(value).trim() === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function volumeInput(input) {
  const mode = input.mode === 'minutes' ? 'minutes' : 'calls';
  const amount = numeric(input.amount);
  return {
    mode,
    calls: amount,
    durationMinutes: mode === 'minutes' ? 1 : numeric(input.durationMinutes),
    uniqueCallers: input.uniqueCallers ?? '',
  };
}

export function estimateVendor(vendor, models, input) {
  const { model } = featureState(vendor, models);
  const volume = volumeInput(input);
  if (!model) {
    const monthly = lowestMonthly(vendor.starting_price);
    return {
      status: 'unknown',
      cents: null,
      planName: '',
      formula: '',
      oneTimeCents: null,
      oneTimeKnown: false,
      reason: monthly == null
        ? 'No official allowance and overage are published, and the listing has no monthly dollar amount.'
        : `No official allowance and overage are published. The listing's lowest monthly amount is $${monthly}. That is not this scenario's bill.`,
      listedMonthly: monthly,
    };
  }
  if (model.unit === 'minute' && volume.mode === 'calls' && volume.durationMinutes === '') {
    return {
      status: 'unknown',
      cents: null,
      planName: '',
      formula: '',
      oneTimeCents: null,
      oneTimeKnown: false,
      reason: 'This vendor publishes minute pricing. Add an average call length, or switch the volume to minutes.',
      listedMonthly: lowestMonthly(vendor.starting_price),
    };
  }
  if (model.unit === 'call' && volume.mode === 'minutes') {
    return {
      status: 'unknown',
      cents: null,
      planName: '',
      formula: '',
      oneTimeCents: null,
      oneTimeKnown: false,
      reason: 'This vendor publishes per-call pricing. Minutes alone cannot make the bill. Enter calls.',
      listedMonthly: lowestMonthly(vendor.starting_price),
    };
  }
  const planInput = {
    calls: volume.calls,
    durationMinutes: model.unit === 'minute' ? volume.durationMinutes : '',
    uniqueCallers: volume.uniqueCallers,
  };
  const rows = (model.plans || []).map((plan) => ({
    plan,
    est: estimatePlan({ ...plan, unit: plan.unit || model.unit }, planInput),
  }));
  const usable = rows.filter((row) => row.est.status === 'estimate' || row.est.status === 'partial');
  if (!usable.length) {
    return {
      status: 'unknown',
      cents: null,
      planName: '',
      formula: '',
      oneTimeCents: null,
      oneTimeKnown: false,
      reason: rows[0]?.est.reason || 'The published price cannot be estimated from this volume.',
      listedMonthly: lowestMonthly(vendor.starting_price),
    };
  }
  usable.sort((a, b) => {
    const rank = (row) => (row.est.status === 'estimate' ? 0 : 1);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (a.est.scenarioCents ?? Infinity) - (b.est.scenarioCents ?? Infinity);
  });
  const best = usable[0];
  return {
    status: best.est.status,
    cents: best.est.scenarioCents,
    planName: best.plan.name,
    formula: best.est.formula,
    oneTimeCents: best.est.oneTimeCents,
    oneTimeKnown: best.est.oneTimeKnown,
    reason: best.est.reason || '',
    listedMonthly: lowestMonthly(vendor.starting_price),
  };
}

function budgetRelation(estimate, budget) {
  if (budget == null || budget === '') return null;
  const limit = Number(budget);
  if (!Number.isFinite(limit)) return null;
  if (estimate.cents == null) return 'unknown';
  const dollars = estimate.cents / 100;
  if (estimate.status === 'partial') return dollars > limit ? 'over' : 'partial';
  if (estimate.status === 'estimate') return dollars <= limit ? 'within' : 'over';
  return 'unknown';
}

export function matchVendors(vendors, models, input) {
  const industry = input.industry;
  const required = MUST.filter((key) => input.must && input.must[key]);
  const pool = vendors.filter((vendor) => !industry || (vendor.industries || []).includes(industry));
  const ranked = pool.map((vendor) => {
    const features = featureState(vendor, models);
    const estimate = estimateVendor(vendor, models, input);
    const met = [];
    const unknown = [];
    const contradicted = [];
    let score = 0;
    for (const key of required) {
      const state = features[key];
      if (state === 'yes') {
        met.push(key);
        score += 10;
      } else if (state === 'no') {
        contradicted.push(key);
        score -= 100;
      } else {
        unknown.push(key);
        score -= 1;
      }
    }
    const budget = budgetRelation(estimate, input.budget);
    if (budget === 'within') score += 5;
    if (budget === 'over') score -= 20;
    return {
      slug: vendor.slug,
      name: vendor.name,
      sponsored: isSponsored(vendor),
      estimate,
      met,
      unknown,
      contradicted,
      budget,
      score,
    };
  });
  const eligible = ranked.filter((row) => row.contradicted.length === 0);
  eligible.sort((a, b) => b.score - a.score || compareCost(a, b) || a.name.localeCompare(b.name));
  const sponsored = ranked
    .filter((row) => row.sponsored)
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    picks: eligible.slice(0, 3),
    considered: pool.length,
    eligible: eligible.length,
    sponsored,
    required,
  };
}

function compareCost(a, b) {
  const ac = a.estimate.status === 'estimate' ? a.estimate.cents : null;
  const bc = b.estimate.status === 'estimate' ? b.estimate.cents : null;
  if (ac == null && bc == null) return 0;
  if (ac == null) return 1;
  if (bc == null) return -1;
  return ac - bc;
}

export function money(cents) {
  return formatUsd(cents);
}

export { MUST };
