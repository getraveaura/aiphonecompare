// Scenario math for plans whose own pricing pages publish the billing unit.
// A missing fee stays missing. It is never treated as zero.

export function parseAmount(value) {
  if (value == null) return { state: 'missing' };
  const text = typeof value === 'number' ? String(value) : String(value).trim();
  if (text === '') return { state: 'missing' };
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return { state: 'invalid' };
  return { state: 'ok', value: n };
}

function centsFrom(dollars) {
  return Math.round((dollars + Number.EPSILON) * 100);
}

export function formatUsd(cents) {
  if (cents == null || !Number.isFinite(cents)) return null;
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars.toLocaleString('en-US')}.${rem}`;
}

function result(partial) {
  return {
    status: 'cannot',
    scenarioCents: null,
    oneTimeCents: null,
    oneTimeKnown: false,
    minutes: null,
    overageUnits: null,
    formula: '',
    reason: '',
    ...partial,
  };
}

function oneTime(plan) {
  if (plan.setupFee == null) return { oneTimeCents: null, oneTimeKnown: false };
  return { oneTimeCents: centsFrom(plan.setupFee), oneTimeKnown: true };
}

function wholeCount(parsed, label) {
  if (parsed.state === 'missing') return { error: `Enter ${label}.` };
  if (parsed.state === 'invalid') return { error: `${label} must be zero or greater.` };
  if (!Number.isInteger(parsed.value)) return { error: `${label} has to be a whole number.` };
  return { value: parsed.value };
}

export function estimatePlan(plan, input = {}) {
  const fees = oneTime(plan);
  if (plan.estimable === false || plan.publishedMonthly == null) {
    return result({
      ...fees,
      reason: plan.reason || 'The monthly price needed for this scenario is not published.',
    });
  }

  const calls = parseAmount(input.calls);
  const duration = parseAmount(input.durationMinutes);
  const unique = parseAmount(input.uniqueCallers);

  if (plan.unit === 'minute') {
    const callCount = wholeCount(calls, 'monthly calls');
    if (callCount.error) return result({ ...fees, reason: callCount.error });
    if (duration.state === 'missing') {
      return result({ ...fees, reason: 'Enter an average call length. This plan bills by the minute.' });
    }
    if (duration.state === 'invalid') {
      return result({ ...fees, reason: 'Average call length must be zero or greater.' });
    }
    const minutes = callCount.value * duration.value;
    const included = plan.included;
    if (included == null) {
      return result({ ...fees, minutes, reason: 'The included minutes are not published.' });
    }
    const over = Math.max(0, minutes - included);
    const feeCents = centsFrom(plan.publishedMonthly);
    if (over === 0) {
      return result({
        ...fees,
        status: 'estimate',
        scenarioCents: feeCents,
        minutes,
        overageUnits: 0,
        formula: `${callCount.value} calls × ${duration.value} min = ${minutes} min, inside ${included} included. Monthly charge is the published plan price ${formatUsd(feeCents)}. Minutes are not rounded up.`,
      });
    }
    if (plan.overage == null) {
      return result({
        ...fees,
        status: 'partial',
        scenarioCents: feeCents,
        minutes,
        overageUnits: over,
        formula: `${minutes} min is ${over} min over the ${included} included. The overage rate is not published. Partial subtotal is the plan price only, ${formatUsd(feeCents)}.`,
        reason: 'Overage rate is not published.',
      });
    }
    const overCents = Math.round(over * centsFrom(plan.overage));
    const total = feeCents + overCents;
    return result({
      ...fees,
      status: 'estimate',
      scenarioCents: total,
      minutes,
      overageUnits: over,
      formula: `${callCount.value} calls × ${duration.value} min = ${minutes} min. ${formatUsd(feeCents)} plan price + ${over} min × ${formatUsd(centsFrom(plan.overage))} = ${formatUsd(total)}. Minutes are not rounded up.`,
    });
  }

  if (plan.unit === 'call') {
    const callCount = wholeCount(calls, 'monthly calls');
    if (callCount.error) return result({ ...fees, reason: callCount.error });
    const included = plan.included;
    if (included == null) return result({ ...fees, reason: 'The included calls are not published.' });
    const over = Math.max(0, callCount.value - included);
    const feeCents = centsFrom(plan.publishedMonthly);
    if (over === 0) {
      return result({
        ...fees,
        status: 'estimate',
        scenarioCents: feeCents,
        overageUnits: 0,
        formula: `${callCount.value} calls are inside ${included} included calls. Monthly charge is the published plan price ${formatUsd(feeCents)}. Call length is not part of this bill.`,
      });
    }
    if (plan.overage == null) {
      return result({
        ...fees,
        status: 'partial',
        scenarioCents: feeCents,
        overageUnits: over,
        formula: `${over} calls are over the ${included} included. The extra-call rate is not published. Partial subtotal is the plan price only, ${formatUsd(feeCents)}.`,
        reason: 'Extra-call rate is not published.',
      });
    }
    const overCents = over * centsFrom(plan.overage);
    const total = feeCents + overCents;
    return result({
      ...fees,
      status: 'estimate',
      scenarioCents: total,
      overageUnits: over,
      formula: `${formatUsd(feeCents)} plan price + ${over} extra calls × ${formatUsd(centsFrom(plan.overage))} = ${formatUsd(total)}. Call length is not part of this bill.`,
    });
  }

  if (plan.unit === 'customer') {
    const callers = wholeCount(unique, 'unique callers');
    if (callers.error) {
      const reason = unique.state === 'missing'
        ? 'This plan bills unique customers, not calls or minutes. Enter unique callers, or this row cannot be estimated.'
        : callers.error;
      return result({ ...fees, reason });
    }
    const included = plan.included;
    if (included == null) return result({ ...fees, reason: 'The included customers are not published.' });
    const over = Math.max(0, callers.value - included);
    const feeCents = centsFrom(plan.publishedMonthly);
    if (over === 0) {
      return result({
        ...fees,
        status: 'estimate',
        scenarioCents: feeCents,
        overageUnits: 0,
        formula: `${callers.value} unique callers are inside ${included} included. Monthly charge is the published plan price ${formatUsd(feeCents)}. Call length is not part of this bill.`,
      });
    }
    if (plan.overage == null) {
      return result({
        ...fees,
        status: 'partial',
        scenarioCents: feeCents,
        overageUnits: over,
        formula: `${over} unique callers are over the allowance. The extra-customer rate is not published. Partial subtotal is the plan price only, ${formatUsd(feeCents)}.`,
        reason: 'Extra-customer rate is not published.',
      });
    }
    const overCents = over * centsFrom(plan.overage);
    const total = feeCents + overCents;
    return result({
      ...fees,
      status: 'estimate',
      scenarioCents: total,
      overageUnits: over,
      formula: `${formatUsd(feeCents)} plan price + ${over} extra unique callers × ${formatUsd(centsFrom(plan.overage))} = ${formatUsd(total)}. Calls are not converted into customers.`,
    });
  }

  return result({ ...fees, reason: 'This billing unit is not supported.' });
}

export function estimateAll(providers, input) {
  return providers.map((provider) => ({
    id: provider.id,
    plans: provider.plans.map((plan) => ({
      id: plan.id,
      ...estimatePlan({ ...plan, unit: plan.unit || provider.unit }, input),
    })),
  }));
}
