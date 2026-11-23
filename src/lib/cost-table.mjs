// Static 50 / 150 / 300 call bills for /cost/. Every figure is the cost engine
// applied to a printed plan. A missing fee stays missing.
import { estimatePlan, formatUsd } from './cost.mjs';
import { formatDate } from './stories.mjs';

export const TABLE_CALLS = [50, 150, 300];
export const TABLE_MINUTES = 3;

function plansOf(provider) {
  return (provider.plans || []).map((plan) => ({ ...plan, unit: plan.unit || provider.unit }));
}

function cheapest(provider, calls) {
  const complete = plansOf(provider)
    .map((plan) => ({ plan, estimate: estimatePlan(plan, { calls, durationMinutes: TABLE_MINUTES }) }))
    .filter((row) => row.estimate.status === 'estimate' && row.estimate.scenarioCents != null);
  complete.sort((a, b) => a.estimate.scenarioCents - b.estimate.scenarioCents || a.plan.name.localeCompare(b.plan.name));
  return complete[0] || null;
}

function setupText(plan) {
  if (!plan || plan.setupFee == null) return 'not published';
  if (plan.setupFee === 0 && /included/i.test(plan.publishedLabel || '')) return 'Page says included';
  if (plan.setupFee === 0) return 'Page says none';
  return `${formatUsd(Math.round(plan.setupFee * 100))} one time`;
}

function billText(chosen) {
  if (!chosen) return 'not published';
  const money = formatUsd(chosen.estimate.scenarioCents);
  const calculated = chosen.estimate.overageUnits > 0;
  return calculated ? `${money} (our calculation)` : money;
}

function starting(provider) {
  const priced = plansOf(provider).filter((plan) => plan.estimable !== false && plan.publishedMonthly != null);
  priced.sort((a, b) => a.publishedMonthly - b.publishedMonthly || a.name.localeCompare(b.name));
  const plan = priced[0];
  if (!plan) return 'not published';
  return plan.publishedLabel;
}

export function billsByKind(models, kind) {
  return models.providers
    .filter((provider) => provider.productKind === kind && provider.unit !== 'customer')
    .map((provider) => {
      const at = {};
      for (const calls of TABLE_CALLS) at[calls] = cheapest(provider, calls);
      const mid = at[150];
      return {
        slug: provider.slug,
        name: provider.name,
        bestFor: provider.bestFor || '',
        unit: provider.unit === 'minute' ? 'Minute' : provider.unit === 'call' ? 'Call' : provider.unit === 'conversation' ? 'Conversation' : provider.unit,
        starting: starting(provider),
        at,
        cells: Object.fromEntries(TABLE_CALLS.map((calls) => [calls, billText(at[calls])])),
        setup: setupText(mid?.plan),
        planNames: Object.fromEntries(TABLE_CALLS.map((calls) => [calls, at[calls]?.plan.name || ''])),
        sourceHref: provider.sources?.[0]?.href || '',
        sourceLabel: provider.sources?.[0]?.label || '',
        checked: provider.checked || models.checked || '',
        checkedLabel: formatDate(provider.checked || models.checked || ''),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readyRange(models, calls = 150) {
  const rows = billsByKind(models, 'ready')
    .map((row) => ({ name: row.name, cents: row.at[calls]?.estimate.scenarioCents }))
    .filter((row) => row.cents != null)
    .sort((a, b) => a.cents - b.cents || a.name.localeCompare(b.name));
  if (!rows.length) return null;
  const low = rows[0];
  const high = rows[rows.length - 1];
  const lows = rows.filter((row) => row.cents === low.cents).map((row) => row.name);
  const tidy = (text) => text.replace(/\.00$/, '');
  const lowText = formatUsd(low.cents);
  const highText = formatUsd(high.cents);
  return {
    lowCents: low.cents,
    highCents: high.cents,
    lowText,
    highText,
    lowNames: lows,
    highName: high.name,
    count: rows.length,
    text: `${lowText} to ${highText}`,
    dash: `${tidy(lowText)}–${tidy(highText)}`,
    prose: `${tidy(lowText)} to ${tidy(highText)}`,
  };
}
