import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkOverpaying,
  monthlyCostBucket,
  overpayingCopy,
  overpayingPath,
  overpayingUrl,
  parseOverpayingQuery,
} from '../src/lib/overpaying.mjs';
import { quoteDirectory } from '../src/lib/calculator.mjs';
import { LEAD_ENDPOINT, buildLeadPayload, validEmail } from '../src/lib/leads.mjs';
import models from '../src/data/cost-models.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };

const dentalInput = { industry: 'dental', cost: 400, calls: 150, minutes: 3 };

function fakeData() {
  const vendor = (slug, sponsored = false) => ({
    slug, name: slug[0].toUpperCase() + slug.slice(1), sponsored, industries: ['dental'], sources: [], last_checked: '2026-11-01',
  });
  const provider = (slug, monthly, setupFee) => ({
    slug,
    unit: 'call',
    sources: [{ href: `https://${slug}.example/pricing`, label: 'Pricing page' }],
    caveats: [],
    plans: [{ name: 'Only', publishedMonthly: monthly, publishedLabel: `$${monthly}/mo`, included: 1000, overage: null, setupFee }],
  });
  return {
    vendors: [vendor('alpha'), vendor('bravo', true), vendor('charlie'), vendor('delta'), vendor('echo'), vendor('foxtrot'), vendor('golf')],
    models: {
      checked: '2026-11-01',
      providers: [
        provider('alpha', 50, 0),
        provider('bravo', 300, null),
        provider('charlie', 100, 25),
        provider('delta', 150, 0),
        provider('echo', 200, 0),
        provider('foxtrot', 250, 0),
      ],
    },
  };
}

test('parsing keeps usable numbers, flags bad ones, and leaves a blank cost blank', () => {
  assert.deepEqual(parseOverpayingQuery({}), {
    input: { industry: 'all', cost: null, calls: 150, minutes: 3 },
    errors: {},
  });
  assert.deepEqual(parseOverpayingQuery({ industry: 'dental', cost: '400', calls: '150', minutes: '3' }).input, dentalInput);
  const bad = parseOverpayingQuery({ industry: 'nope', cost: '-5', calls: '12.5', minutes: 'abc' });
  assert.equal(bad.input.industry, 'all');
  assert.equal(bad.input.cost, null);
  assert.equal(bad.input.calls, 150);
  assert.equal(bad.input.minutes, 3);
  assert.deepEqual(Object.keys(bad.errors).sort(), ['calls', 'cost', 'minutes']);
  assert.equal(parseOverpayingQuery({ cost: 'NaN' }).input.cost, null);
  assert.equal(parseOverpayingQuery({ cost: '1e9' }).input.cost, null);
  assert.equal(parseOverpayingQuery({ cost: ' 249.999 ' }).input.cost, 250);
  assert.equal(parseOverpayingQuery({ cost: '0' }).input.cost, 0);
});

test('query string round trip opens the same result', () => {
  const path = overpayingPath(dentalInput);
  assert.equal(path, '/overpaying/?industry=dental&cost=400&calls=150&minutes=3');
  const params = Object.fromEntries(new URL(path, 'https://aiphonecompare.com').searchParams);
  assert.deepEqual(parseOverpayingQuery(params).input, dentalInput);
  const decimal = { industry: 'all', cost: 89.5, calls: 40, minutes: 2.5 };
  const back = Object.fromEntries(new URLSearchParams(overpayingPath(decimal).split('?')[1]));
  assert.deepEqual(parseOverpayingQuery(back).input, decimal);
  assert.equal(overpayingPath({ ...decimal, cost: null }), '/overpaying/?calls=40&minutes=2.5');
  assert.ok(overpayingUrl(dentalInput).startsWith('https://aiphonecompare.com/overpaying/'));
});

test('dental at $400 uses the calculator estimates and computes the difference from them', () => {
  const result = checkOverpaying(vendors, models, dentalInput);
  const quote = quoteDirectory(vendors, models, { ...dentalInput, afterHours: null });
  assert.equal(result.state, 'savings');
  assert.equal(result.estimatedCount, quote.priced.length);
  const byCalc = Object.fromEntries(quote.priced.map((row) => [row.slug, row.monthlyCents]));
  for (const row of result.options) assert.equal(row.monthlyCents, byCalc[row.slug]);
  const lowest = Math.min(...quote.priced.map((row) => row.monthlyCents));
  assert.equal(result.lowest.monthlyCents, lowest);
  assert.equal(result.savingsCents, 40000 - lowest);
  assert.equal(result.cheaperCount, quote.priced.filter((row) => row.monthlyCents < 40000).length);
  for (const row of result.options) {
    assert.ok(row.sourceHref.startsWith('https://'));
    assert.equal(row.vendorHref, `/vendors/${row.slug}/`);
    assert.equal(row.differenceCents, 40000 - row.monthlyCents);
  }
  assert.match(overpayingCopy(result).heading, /keep the same coverage for less/);
});

test('ranking is by monthly estimate, sponsored does not move up, and options cap at five', () => {
  const { vendors: v, models: m } = fakeData();
  const result = checkOverpaying(v, m, { industry: 'dental', cost: 1000, calls: 10, minutes: 3 });
  assert.equal(result.state, 'savings');
  assert.equal(result.cheaperCount, 6);
  assert.equal(result.options.length, 5);
  assert.deepEqual(result.options.map((row) => row.slug), ['alpha', 'charlie', 'delta', 'echo', 'foxtrot']);
  assert.equal(result.options.some((row) => row.slug === 'bravo'), false);
  assert.deepEqual(result.missing.map((row) => row.slug), ['golf']);
});

test('nothing cheaper gives the competitive state with the closest plans and no savings', () => {
  const { vendors: v, models: m } = fakeData();
  const result = checkOverpaying(v, m, { industry: 'dental', cost: 50, calls: 10, minutes: 3 });
  assert.equal(result.state, 'competitive');
  assert.equal(result.cheaperCount, 0);
  assert.equal(result.savingsCents, null);
  assert.equal(result.savings, null);
  assert.deepEqual(result.options.map((row) => row.slug), ['alpha', 'charlie', 'delta', 'echo', 'foxtrot']);
  assert.equal(result.options[0].differenceCents, 0);
  assert.equal(result.options[0].cheaper, false);
  assert.match(overpayingCopy(result).heading, /already competitive/);
  const real = checkOverpaying(vendors, models, { ...dentalInput, cost: 5 });
  assert.equal(real.state, 'competitive');
});

test('a missing setup fee stays missing and is never counted as zero', () => {
  const { vendors: v, models: m } = fakeData();
  const pair = v.filter((row) => row.slug === 'alpha' || row.slug === 'bravo');
  const result = checkOverpaying(pair, m, { industry: 'dental', cost: 1000, calls: 10, minutes: 3 });
  const bravo = result.options.find((row) => row.slug === 'bravo');
  assert.equal(bravo.setup, 'Not verified');
  assert.equal(bravo.setupKnown, false);
  assert.equal(bravo.monthlyCents, 30000);
  const alpha = result.options.find((row) => row.slug === 'alpha');
  assert.equal(alpha.setup, 'No setup fee on the pricing page');
  assert.equal(alpha.setupKnown, true);
  const smith = checkOverpaying(vendors, models, dentalInput).options.find((row) => row.slug === 'smith-ai');
  assert.equal(smith.setup, 'Not verified');
  assert.equal(smith.setupKnown, false);
});

test('empty and needs-cost states, and cost buckets', () => {
  const { vendors: v, models: m } = fakeData();
  const empty = checkOverpaying(v, { ...m, providers: [] }, { industry: 'dental', cost: 100, calls: 10, minutes: 3 });
  assert.equal(empty.state, 'empty');
  assert.equal(empty.options.length, 0);
  assert.equal(empty.lowest, null);
  const waiting = checkOverpaying(v, m, { industry: 'dental', cost: null, calls: 10, minutes: 3 });
  assert.equal(waiting.state, 'needs-cost');
  assert.equal(waiting.cheaperCount, 0);
  assert.equal(waiting.options[0].slug, 'alpha');
  assert.equal(waiting.options[0].differenceCents, null);
  assert.deepEqual([50, 100, 249.99, 250, 499, 500, 999, 1000, null].map(monthlyCostBucket),
    ['<100', '100-249', '100-249', '250-499', '250-499', '500-999', '500-999', '1000+', 'unknown']);
});

test('lead payload: absolute results url, matches capped at five, honeypot passed through', () => {
  const { vendors: v, models: m } = fakeData();
  const input = { industry: 'dental', cost: 1000, calls: 10, minutes: 3 };
  const result = checkOverpaying(v, m, input);
  const payload = buildLeadPayload({ email: ' a@b.co ', name: ' Sam ', business: '', honeypot: 'spam.example' }, result);
  assert.equal(LEAD_ENDPOINT, 'https://muupitrhtaatzgaeghyg.supabase.co/functions/v1/apc-lead');
  assert.equal(payload.email, 'a@b.co');
  assert.equal(payload.name, 'Sam');
  assert.equal(payload.business, '');
  assert.equal(payload.source, 'overpaying');
  assert.equal(payload.industry, 'dental');
  assert.equal(payload.company_website, 'spam.example');
  assert.equal(payload.monthly_cost, 1000);
  assert.equal(payload.monthly_calls, 10);
  assert.equal(payload.call_minutes, 3);
  assert.equal(payload.results_url, 'https://aiphonecompare.com/overpaying/?industry=dental&cost=1000&calls=10&minutes=3');
  assert.equal(payload.matches.length, 5);
  assert.deepEqual(payload.matches[0], { vendor: 'Alpha', plan: 'Only', monthly: 50 });
  assert.equal(buildLeadPayload({ email: 'a@b.co' }, result).company_website, '');
  assert.equal(validEmail('a@b.co'), true);
  assert.equal(validEmail('not an email'), false);
});
