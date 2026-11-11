import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatorPath, parseCalculatorQuery, quoteDirectory } from '../src/lib/calculator.mjs';
import models from '../src/data/cost-models.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };

const dental = quoteDirectory(vendors, models, { industry: 'dental', calls: 150, minutes: 3, afterHours: 40 });

test('query parsing keeps only usable numbers and does not price after-hours', () => {
  assert.deepEqual(parseCalculatorQuery({}), { industry: 'all', calls: 150, minutes: 3, afterHours: null });
  assert.equal(parseCalculatorQuery({ industry: 'nope', calls: '-2', minutes: '3.5', after: '120' }).industry, 'all');
  assert.equal(parseCalculatorQuery({ minutes: '3.5' }).minutes, 3.5);
  assert.equal(parseCalculatorQuery({ after: '20' }).afterHours, 20);
  const withShare = quoteDirectory(vendors, models, { industry: 'all', calls: 150, minutes: 3, afterHours: 80 });
  const without = quoteDirectory(vendors, models, { industry: 'all', calls: 150, minutes: 3, afterHours: null });
  assert.deepEqual(
    withShare.priced.map((row) => [row.slug, row.monthlyCents, row.yearCents]),
    without.priced.map((row) => [row.slug, row.monthlyCents, row.yearCents]),
  );
});

test('dental quotes use a complete plan and leave unique-caller and unpublished plans out', () => {
  const dialzara = dental.priced.find((row) => row.slug === 'dialzara');
  assert.ok(dialzara);
  assert.equal(dialzara.monthly, '$199.00');
  assert.equal(dialzara.year, '$2,388.00');
  assert.equal(dialzara.lowest, true);
  const smith = dental.priced.find((row) => row.slug === 'smith-ai');
  assert.equal(smith.year, 'Not enough public pricing');
  assert.equal(smith.lowest, false);
  assert.equal(dental.missing.some((row) => row.slug === 'goodcall'), true);
  assert.equal(dental.missing.some((row) => row.slug === 'ruby'), true);
  assert.match(dental.missing.find((row) => row.slug === 'goodcall').reason, /unique callers/);
});

test('sponsored does not move a dearer vendor ahead of a cheaper one', () => {
  const fakeVendors = [
    { slug: 'dear', name: 'Dear', sponsored: true, industries: ['dental'], sources: [], last_checked: '2026-11-01' },
    { slug: 'cheap', name: 'Cheap', sponsored: false, industries: ['dental'], sources: [], last_checked: '2026-11-01' },
  ];
  const fakeModels = {
    checked: '2026-11-06',
    providers: [
      { id: 'dear', slug: 'dear', unit: 'call', sources: [{ href: 'https://example.com/dear', label: 'dear' }], caveats: [], plans: [{ id: 'a', name: 'A', publishedMonthly: 100, included: 10, overage: 1, setupFee: 0, publishedLabel: '$100' }] },
      { id: 'cheap', slug: 'cheap', unit: 'call', sources: [{ href: 'https://example.com/cheap', label: 'cheap' }], caveats: [], plans: [{ id: 'a', name: 'A', publishedMonthly: 20, included: 10, overage: 1, setupFee: 0, publishedLabel: '$20' }] },
    ],
  };
  const quote = quoteDirectory(fakeVendors, fakeModels, { industry: 'dental', calls: 10, minutes: 3, afterHours: null });
  assert.deepEqual(quote.priced.map((row) => row.slug), ['cheap', 'dear']);
  assert.equal(quote.priced[0].lowest, true);
  assert.equal(quote.priced[1].sponsored, true);
});

test('mins is accepted as an alias for minutes, with minutes taking precedence', () => {
  assert.equal(parseCalculatorQuery({ industry: 'dental', calls: '300', mins: '3' }).minutes, 3);
  assert.equal(parseCalculatorQuery({ mins: '4.5' }).minutes, 4.5);
  assert.equal(parseCalculatorQuery({ minutes: '2', mins: '5' }).minutes, 2);
});

test('the share path round-trips the inputs', () => {
  const input = { industry: 'plumbing', calls: 80, minutes: 3, afterHours: 25 };
  const params = Object.fromEntries(new URLSearchParams(calculatorPath(input).split('?')[1]));
  assert.deepEqual(parseCalculatorQuery(params), input);
});
