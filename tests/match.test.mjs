import { test } from 'node:test';
import assert from 'node:assert/strict';
import models from '../src/data/cost-models.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };
import { baaState, matchVendors, spanishState } from '../src/lib/match.mjs';

const base = {
  slug: 'alpha',
  name: 'Alpha',
  industries: ['dental'],
  starting_price: '',
  notes: '',
  integrations: '',
  human_handoff: '',
  hipaa_baa: '',
  sponsored: false,
};

test('a blank BAA is unknown and a denial is not a yes', () => {
  assert.equal(baaState(''), 'unknown');
  assert.equal(baaState('SOC 2 and HIPAA; confirm BAA'), 'unknown');
  assert.equal(baaState('Public pages name no BAA; states it is not HIPAA-compliant'), 'no');
  assert.equal(baaState('Signs a BAA on the Scale plan'), 'yes');
  assert.equal(spanishState({ notes: '10 languages', integrations: '', starting_price: '' }), 'unknown');
  assert.equal(spanishState({ notes: 'English + Spanish.', integrations: '', starting_price: '' }), 'yes');
});

test('a contradicted must-have is left out of the three fits', () => {
  const rows = [
    { ...base, slug: 'no-baa', name: 'No BAA', hipaa_baa: 'states it is not HIPAA-compliant' },
    { ...base, slug: 'yes-baa', name: 'Yes BAA', hipaa_baa: 'Signs a BAA with every practice' },
    { ...base, slug: 'blank', name: 'Blank BAA', hipaa_baa: '' },
  ];
  const result = matchVendors(rows, { providers: [] }, {
    industry: 'dental',
    mode: 'calls',
    amount: '40',
    durationMinutes: '3',
    budget: '',
    must: { baa: true },
  });
  assert.deepEqual(result.picks.map((row) => row.slug), ['yes-baa', 'blank']);
  assert.equal(result.picks[0].met.includes('baa'), true);
  assert.equal(result.picks[1].unknown.includes('baa'), true);
});

test('sponsored does not change the order', () => {
  const rows = [
    { ...base, slug: 'bravo', name: 'Bravo', sponsored: true, hipaa_baa: 'Signs a BAA' },
    { ...base, slug: 'alpha', name: 'Alpha', sponsored: false, hipaa_baa: 'Signs a BAA' },
  ];
  const result = matchVendors(rows, { providers: [] }, {
    industry: 'dental',
    mode: 'calls',
    amount: '10',
    durationMinutes: '',
    budget: '',
    must: { baa: true },
  });
  assert.deepEqual(result.picks.map((row) => row.name), ['Alpha', 'Bravo']);
  assert.equal(result.sponsored.length, 1);
  assert.equal(result.sponsored[0].slug, 'bravo');
});

test('an in-budget estimate ranks ahead of an over-budget estimate', () => {
  const minute = {
    unit: 'minute',
    plans: [
      { id: 'small', name: 'Small', publishedMonthly: 29, included: 60, overage: 0.48, setupFee: 0 },
    ],
  };
  const rows = [
    { ...base, slug: 'low', name: 'Low' },
    { ...base, slug: 'high', name: 'High' },
  ];
  const catalog = {
    providers: [
      { slug: 'low', ...minute },
      {
        slug: 'high',
        unit: 'minute',
        plans: [{ id: 'big', name: 'Big', publishedMonthly: 400, included: 10, overage: 1, setupFee: 0 }],
      },
    ],
  };
  const result = matchVendors(rows, catalog, {
    industry: 'dental',
    mode: 'calls',
    amount: '10',
    durationMinutes: '3',
    budget: '50',
    must: {},
  });
  assert.equal(result.picks[0].slug, 'low');
  assert.equal(result.picks[0].budget, 'within');
  assert.equal(result.picks[1].budget, 'over');
  assert.equal(result.picks[0].estimate.cents, 2900);
});

test('AgentZap uses the published minute plan and does not treat a missing length as zero', () => {
  const agent = vendors.find((vendor) => vendor.slug === 'agentzap');
  const missing = matchVendors([agent], models, {
    industry: 'therapy',
    mode: 'calls',
    amount: '100',
    durationMinutes: '',
    budget: '',
    must: {},
  });
  assert.equal(missing.picks[0].estimate.status, 'unknown');
  assert.match(missing.picks[0].estimate.reason, /call length/);
  const estimated = matchVendors([agent], models, {
    industry: 'therapy',
    mode: 'calls',
    amount: '100',
    durationMinutes: '3',
    budget: '',
    must: {},
  });
  assert.equal(estimated.picks[0].estimate.status, 'estimate');
  assert.equal(estimated.picks[0].estimate.planName, 'Starter');
  assert.equal(estimated.picks[0].estimate.cents, 23650);
});
