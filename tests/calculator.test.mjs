import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  const zinng = dental.priced.find((row) => row.slug === 'zinng-ai');
  assert.equal(zinng.monthly, '$99.00');
  assert.equal(zinng.lowest, true);
  assert.equal(dialzara.lowest, false);
  const smith = dental.priced.find((row) => row.slug === 'smith-ai');
  assert.equal(smith.year, 'Not enough public pricing');
  assert.equal(smith.lowest, false);
  assert.equal(dental.missing.some((row) => row.slug === 'goodcall'), true);
  assert.match(dental.missing.find((row) => row.slug === 'goodcall').reason, /different caller/);
  const ruby = dental.priced.find((row) => row.slug === 'ruby');
  assert.ok(ruby);
  assert.equal(ruby.planName, 'Call Ruby 350');
  assert.equal(ruby.monthly, '$1,635.00');
  assert.equal(ruby.year, '$19,620.00');
  assert.equal(ruby.checked, '2026-11-20');
  assert.equal(ruby.kindLabel, 'Live receptionist');
  assert.equal(ruby.productKind, 'live');
  const plumbing = quoteDirectory(vendors, models, { industry: 'plumbing', calls: 150, minutes: 3, afterHours: null });
  const jobber = plumbing.priced.find((row) => row.slug === 'jobber-ai-receptionist');
  assert.ok(jobber);
  assert.equal(jobber.planName, 'AI Receptionist add-on');
  assert.equal(jobber.monthly, '$138.50');
  assert.equal(jobber.year, 'Not enough public pricing');
  assert.equal(jobber.checked, '2026-11-22');
});

test('sponsored does not move a dearer vendor ahead of a cheaper one', () => {
  const fakeVendors = [
    { slug: 'dear', name: 'Dear', sponsored: true, spotlight: { industry: 'dental', start: '2000-01-01', end: '2999-12-31' }, industries: ['dental'], sources: [], last_checked: '2026-11-01' },
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

test('the priced results table links to the full AI vs live receptionist cost breakdown', () => {
  const page = fs.readFileSync(new URL('../src/pages/cost/calculator.astro', import.meta.url), 'utf8');
  const pricedAt = page.indexOf('Vendors with a complete monthly estimate');
  const missingAt = page.indexOf('<h2 class="section-title">Not enough public pricing</h2>');
  assert.ok(pricedAt >= 0, 'priced results table');
  assert.ok(missingAt > pricedAt, 'missing-pricing heading follows the priced table');
  const between = page.slice(pricedAt, missingAt);
  assert.match(
    between,
    /<p class="tool-line">Comparing with a live receptionist\? <a href="\/cost\/ai-vs-live-receptionist\/">See the full AI vs live receptionist cost breakdown<\/a>\.<\/p>/,
  );
  const intro = page.slice(0, pricedAt);
  assert.match(
    intro,
    /<p class="tool-line">Thinking about a live receptionist instead\? See <a href="\/cost\/ai-vs-live-receptionist\/">what live and AI cost at 50, 150 and 300 calls<\/a>\.<\/p>/,
  );
});
