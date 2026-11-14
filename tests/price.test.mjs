import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lowestMonthly, byPublishedMonthlyPrice } from '../src/lib/price.mjs';

const vendors = JSON.parse(fs.readFileSync('src/data/vendors.json', 'utf8'));

test('add-on amounts written with "+" are not a lowest monthly price', () => {
  assert.equal(lowestMonthly('Plan $350/mo for the first provider, +$150/mo per added provider'), 350);
  assert.equal(lowestMonthly('Base $99/mo + $20/mo per extra seat'), 99);
  assert.equal(lowestMonthly('Add-on only: +$29/mo'), null);
});

test('Viva AI sorts on its $349/mo base plan, not the $150 per-provider add-on', () => {
  const viva = vendors.find((v) => v.slug === 'viva-ai');
  assert.equal(lowestMonthly(viva.starting_price), 349);
  const order = byPublishedMonthlyPrice(vendors).map((v) => v.slug);
  const above = vendors.filter((v) => { const n = lowestMonthly(v.starting_price); return n != null && n < 349; }).length;
  assert.ok(order.indexOf('viva-ai') >= above, 'Viva is not ranked among the sub-$349 plans');
});

test('other lowest monthly amounts are unchanged by the add-on rule', () => {
  const expected = { 'smith-ai': 150, goodcall: 79, 'abby-connect': 164, oncrew: 49, upfirst: 20, agentzap: 109, 'elevenlabs-ai-receptionist': 0, serviceagent: 0 };
  for (const [slug, n] of Object.entries(expected)) {
    assert.equal(lowestMonthly(vendors.find((v) => v.slug === slug).starting_price), n, slug);
  }
});
