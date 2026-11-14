import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summaryPoints, boldParts } from '../src/lib/summary-points.mjs';
import { industrySummary } from '../src/lib/answers.mjs';
import { lowestMonthly, lowestMonthlyListing } from '../src/lib/price.mjs';
import { ctaSpan } from '../src/lib/grid.mjs';
import { matchVendors } from '../src/lib/match.mjs';
import { siteOffline, offlineLabel } from '../src/lib/site-status.mjs';

const vendors = JSON.parse(readFileSync(new URL('../src/data/vendors.json', import.meta.url)));
const models = JSON.parse(readFileSync(new URL('../src/data/cost-models.json', import.meta.url)));
const nums = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(/\.00$/, ''));

for (const key of ['dental', 'legal', 'plumbing', 'medical']) {
  test(`${key} "In short" is 3 bullets with bold numbers taken from the data`, () => {
    const list = vendors.filter((v) => (v.industries || []).includes(key));
    const low = lowestMonthlyListing(list);
    const price = low ? `The lowest monthly amount written in these listings is $${lowestMonthly(low.starting_price)}/mo, for ${low.name}, checked 14 November 2026.` : 'None of these listings has a monthly dollar amount in the starting price.';
    const sentences = industrySummary({ key, vendors: list, priceSentence: price });
    const { points } = summaryPoints(sentences);
    assert.equal(points.length, 3);
    assert.match(points[0], new RegExp(`^\\*\\*${list.length}\\*\\* AI receptionists? listed for `));
    if (low) assert.match(points[1], new RegExp(`\\*\\*\\$${lowestMonthly(low.starting_price)}/mo\\*\\* \\(${low.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`));
    assert.match(points[2], /^\*\*\d+ of \d+\*\*/);
    const source = nums(sentences.join(' '));
    for (const p of points) for (const n of nums(p)) assert.ok(source.includes(n), `${n} in "${p}" is not in the source sentences`);
    for (const p of points) assert.ok(boldParts(p).some((part) => part.bold));
  });
}

test('summary points never add a number that is not in the sentences', () => {
  const s = ['17 vendors are in the dental directory used on this page. The lowest monthly amount written in these listings is $29/mo, for Dialzara, checked 14 November 2026.', 'This page is for dental practices comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.', 'At 150 calls a month, full monthly estimates range from $199.00 for A Plan to $500.00 for B Plan. That is simple math on each company’s listed prices, not a ranking.'];
  const { points, note } = summaryPoints(s);
  assert.equal(points.length, 3);
  assert.match(note, /Not a ranking/);
  const source = nums(s.join(' '));
  for (const p of points) for (const n of nums(p)) assert.ok(source.includes(n), n);
});

test('grid CTA fills the empty slots of the last row', () => {
  assert.equal(ctaSpan(5, 3), 1);
  assert.equal(ctaSpan(5, 2), 1);
  assert.equal(ctaSpan(50, 3), 1);
  assert.equal(ctaSpan(50, 2), 2);
  assert.equal(ctaSpan(4, 3), 2);
  assert.equal(ctaSpan(6, 3), 3);
});

test('PickupBell is kept, labeled offline and left out of match suggestions', () => {
  const pb = vendors.find((v) => v.slug === 'pickupbell');
  assert.ok(pb, 'listing kept');
  assert.ok(siteOffline(pb));
  assert.equal(offlineLabel(pb), 'Site offline as of 14 Nov 2026');
  const result = matchVendors(vendors, models, { industry: 'plumbing', mode: 'calls', amount: 150, must: {} });
  const slugs = JSON.stringify(result);
  assert.ok(!slugs.includes('"pickupbell"'));
});

test('Allo trial is 3 days with a card on file, cited to its FAQ', () => {
  const allo = vendors.find((v) => v.slug === 'allo');
  assert.match(allo.free_trial, /^3-day free trial, card on file/);
  assert.ok(allo.sources.includes(allo.trial_check.source));
  assert.match(allo.trial_check.note, /3-day free trial/);
});

test('vendor "on record" line becomes one bullet per fact', () => {
  const { points } = summaryPoints(['On record, free trial: 7-day trial; human handoff: Blind transfer on entry plan; warm transfer on Pro; HIPAA privacy agreement (BAA): not stated.']);
  assert.deepEqual(points, ['**Free trial:** 7-day trial', '**Human handoff:** Blind transfer on entry plan; warm transfer on Pro', '**HIPAA privacy agreement (BAA):** Not stated']);
});

test('no run-on link paragraphs left on learn pages and the best hub', () => {
  for (const f of ['src/pages/ai-answering-service.astro', 'src/pages/small-business.astro', 'src/pages/best/index.astro', 'src/components/Industry.astro', 'src/components/BestGuide.astro']) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /<p>(Compare by industry|Industry pages|Other industries):/, f);
    assert.doesNotMatch(src, /<p>For a 3-tech HVAC shop/, f);
  }
});
