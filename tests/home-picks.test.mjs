import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homePicks, ownSitePrice } from '../src/lib/home-picks.mjs';
import { planEntry } from '../src/lib/plans.mjs';
import { ctaSpan } from '../src/lib/grid.mjs';

const vendors = JSON.parse(readFileSync(new URL('../src/data/vendors.json', import.meta.url)));
const plans = JSON.parse(readFileSync(new URL('../src/data/price-plans.json', import.meta.url)));
const host = (u) => new URL(u).hostname.replace(/^www\./, '');

test('homepage price grid shows only prices published on the vendor\'s own site', () => {
  const picks = homePicks(vendors, plans, 5);
  assert.equal(picks.length, 5);
  for (const v of picks) {
    assert.ok(v.starting_price && !/^not published|^reported|~|per keragon/i.test(v.starting_price), v.name);
    assert.ok(v.sources.some((s) => host(s) === host(v.website) || host(s).endsWith(`.${host(v.website)}`)), `${v.name} has no own-site source`);
    assert.notEqual(v.site_status?.status, 'offline');
    assert.ok(planEntry(v, plans), `${v.name} should have structured plans`);
  }
  const names = picks.map((v) => v.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), 'A to Z');
  assert.ok(!names.includes('Assort Health') && !names.includes('Arini'));
});

test('not-published, third-party-reported and offline prices are excluded', () => {
  const bySlug = Object.fromEntries(vendors.map((v) => [v.slug, v]));
  for (const slug of ['assort-health', 'arini', 'nexhealth', 'pickupbell', 'avoca']) assert.equal(ownSitePrice(bySlug[slug]), false, slug);
});

test('the See-all card still balances 5 picks', () => {
  assert.equal((5 + ctaSpan(5, 3)) % 3, 0);
  assert.equal((5 + ctaSpan(5, 2)) % 2, 0);
});
