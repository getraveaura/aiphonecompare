import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimatePlan, parseAmount } from '../src/lib/cost.mjs';
import models from '../src/data/cost-models.json' with { type: 'json' };

const minutePlan = {
  unit: 'minute',
  publishedMonthly: 29,
  included: 60,
  overage: 0.48,
  setupFee: 0,
};

test('parses blanks as missing and rejects negatives', () => {
  assert.equal(parseAmount('').state, 'missing');
  assert.equal(parseAmount('  ').state, 'missing');
  assert.equal(parseAmount(null).state, 'missing');
  assert.equal(parseAmount('-3').state, 'invalid');
  assert.equal(parseAmount('abc').state, 'invalid');
  assert.equal(parseAmount('10').value, 10);
});

test('minute plan stays on the plan price inside the allowance', () => {
  const row = estimatePlan(minutePlan, { calls: 10, durationMinutes: 3 });
  assert.equal(row.status, 'estimate');
  assert.equal(row.minutes, 30);
  assert.equal(row.overageUnits, 0);
  assert.equal(row.scenarioCents, 2900);
  assert.equal(row.oneTimeCents, 0);
  assert.equal(row.oneTimeKnown, true);
});

test('minute overage is calls times length, not rounded up to the next minute', () => {
  const row = estimatePlan(minutePlan, { calls: 100, durationMinutes: 3 });
  assert.equal(row.minutes, 300);
  assert.equal(row.overageUnits, 240);
  assert.equal(row.scenarioCents, 14420);
  const partial = estimatePlan(
    { unit: 'minute', publishedMonthly: 0, included: 0, overage: 0.14, setupFee: null },
    { calls: 1, durationMinutes: 1.5 },
  );
  assert.equal(partial.minutes, 1.5);
  assert.equal(partial.scenarioCents, 21);
  assert.equal(partial.oneTimeKnown, false);
  assert.equal(partial.oneTimeCents, null);
});

test('missing overage above the allowance is a partial subtotal, not zero', () => {
  const row = estimatePlan(
    { unit: 'minute', publishedMonthly: 899, included: 1500, overage: null, setupFee: 0 },
    { calls: 400, durationMinutes: 5 },
  );
  assert.equal(row.status, 'partial');
  assert.equal(row.minutes, 2000);
  assert.equal(row.scenarioCents, 89900);
  assert.match(row.formula, /Partial subtotal/);
  assert.doesNotMatch(row.formula, /\$0\.00 plan price \+ 0/);
});

test('per-call billing ignores duration and prices extra calls', () => {
  const plan = { unit: 'call', publishedMonthly: 0, included: 25, overage: 3, setupFee: null };
  const inside = estimatePlan(plan, { calls: 10, durationMinutes: 40 });
  assert.equal(inside.scenarioCents, 0);
  assert.match(inside.formula, /Call length is not part of this bill/);
  const over = estimatePlan(plan, { calls: 30 });
  assert.equal(over.scenarioCents, 1500);
  assert.equal(over.minutes, null);
});

test('unique-customer plans cannot be estimated from calls alone', () => {
  const plan = { unit: 'customer', publishedMonthly: 79, included: 100, overage: 0.79, setupFee: 0 };
  const missing = estimatePlan(plan, { calls: 200, durationMinutes: 4 });
  assert.equal(missing.status, 'cannot');
  assert.equal(missing.scenarioCents, null);
  assert.match(missing.reason, /unique customers/);
  const over = estimatePlan(plan, { uniqueCallers: 120 });
  assert.equal(over.status, 'estimate');
  assert.equal(over.scenarioCents, 9480);
});

test('invalid and blank inputs do not become a zero bill', () => {
  const blank = estimatePlan(minutePlan, { calls: '', durationMinutes: '' });
  assert.equal(blank.status, 'cannot');
  assert.equal(blank.scenarioCents, null);
  const negative = estimatePlan(minutePlan, { calls: -4, durationMinutes: 2 });
  assert.equal(negative.status, 'cannot');
  assert.equal(negative.scenarioCents, null);
  const fraction = estimatePlan(
    { unit: 'call', publishedMonthly: 150, included: 75, overage: 2.5, setupFee: null },
    { calls: 10.5 },
  );
  assert.equal(fraction.status, 'cannot');
  assert.match(fraction.reason, /whole number/);
});

test('unpublished monthly price is cannot estimate, not a computed package', () => {
  const row = estimatePlan(
    { unit: 'call', estimable: false, publishedMonthly: null, setupFee: null, reason: 'No monthly total is printed.' },
    { calls: 150 },
  );
  assert.equal(row.status, 'cannot');
  assert.equal(row.scenarioCents, null);
  assert.equal(row.reason, 'No monthly total is printed.');
});

test('shipped models keep sources, dates, and do not invent yes/no capabilities', () => {
  assert.equal(models.checked, '2026-11-06');
  assert.equal(models.providers.length, 6);
  for (const provider of models.providers) {
    assert.ok(provider.sources.length >= 1);
    assert.ok(provider.sources.every((source) => source.href.startsWith('https://')));
    assert.notEqual(provider.booking.toLowerCase(), 'yes');
    assert.notEqual(provider.booking.toLowerCase(), 'no');
    assert.notEqual(provider.transfer.toLowerCase(), 'yes');
    assert.notEqual(provider.transfer.toLowerCase(), 'no');
    for (const plan of provider.plans) {
      if (plan.overage == null && plan.publishedMonthly != null && plan.included != null) {
        const over = estimatePlan({ ...plan, unit: provider.unit }, { calls: 10000, durationMinutes: 10, uniqueCallers: 10000 });
        assert.notEqual(over.status, 'estimate');
        if (over.status === 'partial') assert.equal(over.scenarioCents, Math.round(plan.publishedMonthly * 100));
      }
    }
  }
});

test('shipped official scenarios match the pricing pages', () => {
  const find = (providerId, planId) => {
    const provider = models.providers.find((item) => item.id === providerId);
    const plan = provider.plans.find((item) => item.id === planId);
    return { ...plan, unit: provider.unit };
  };
  const dialzara = estimatePlan(find('dialzara', 'lite'), { calls: 100, durationMinutes: 3 });
  assert.equal(dialzara.scenarioCents, 14420);
  const bland = estimatePlan(find('bland-ai', 'build'), { calls: 50, durationMinutes: 2 });
  assert.equal(bland.scenarioCents, 29900 + Math.round(100 * 12));
  const smith = estimatePlan(find('smith-ai', 'pro-75'), { calls: 80, durationMinutes: 12 });
  assert.equal(smith.scenarioCents, 15000 + 5 * 250);
  const unpublished = estimatePlan(find('smith-ai', 'pro-150'), { calls: 150 });
  assert.equal(unpublished.status, 'cannot');
  assert.equal(unpublished.scenarioCents, null);
});
