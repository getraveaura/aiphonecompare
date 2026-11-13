import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import models from '../src/data/cost-models.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };
import { outboundLink, REFERRAL_NOTE } from '../src/lib/outbound.mjs';
import { matchVendors } from '../src/lib/match.mjs';
import { quoteDirectory } from '../src/lib/calculator.mjs';
import { checkOverpaying } from '../src/lib/overpaying.mjs';
import { vendorOffer } from '../src/lib/schema.mjs';

const REF = 'https://oncrew.ai/ref/aiphonecompare';
const oncrew = vendors.find((v) => v.slug === 'oncrew');
const withoutReferral = vendors.map(({ referral_url, ...rest }) => rest);
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('OnCrew carries the referral URL and keeps its other data', () => {
  assert.equal(oncrew.referral_url, REF);
  assert.equal(oncrew.website, 'https://oncrew.ai');
  assert.equal(oncrew.sponsored, false);
});

test('outboundLink returns the referral link with rel sponsored for OnCrew', () => {
  assert.deepEqual(outboundLink(oncrew), { href: REF, rel: 'sponsored noopener', isReferral: true });
});

test('outboundLink returns the website for vendors without a referral link', () => {
  const others = vendors.filter((v) => !v.referral_url && v.website);
  assert.ok(others.length > 0);
  for (const v of others) {
    assert.deepEqual(outboundLink(v), { href: v.website, rel: 'nofollow noopener', isReferral: false });
  }
  assert.equal(outboundLink({ slug: 'x', website: '' }), null);
  assert.equal(outboundLink({ slug: 'x', website: 'https://x.test', referral_url: '  ' }).isReferral, false);
});

test('OnCrew ranks the same in match with and without a referral link', () => {
  const inputs = [
    { industry: 'plumbing', must: {}, mode: 'calls', amount: 150, durationMinutes: 3 },
    { industry: 'plumbing', must: { human: true }, mode: 'calls', amount: 60, durationMinutes: 2, budget: 150 },
    { industry: '', must: {}, mode: 'calls', amount: 300, durationMinutes: 4 },
  ];
  for (const input of inputs) {
    const a = matchVendors(vendors, models, input);
    const b = matchVendors(withoutReferral, models, input);
    assert.deepEqual(a, b);
    assert.deepEqual(a.picks.map((r) => r.slug), b.picks.map((r) => r.slug));
  }
});

test('OnCrew ranks the same in the calculator and price check with and without a referral link', () => {
  for (const industry of ['all', 'plumbing']) {
    for (const calls of [30, 150, 600]) {
      const input = { industry, calls, minutes: 3, afterHours: null };
      const a = quoteDirectory(vendors, models, input);
      const b = quoteDirectory(withoutReferral, models, input);
      assert.deepEqual(a.priced.map((r) => r.slug), b.priced.map((r) => r.slug));
      assert.equal(a.priced.findIndex((r) => r.slug === 'oncrew'), b.priced.findIndex((r) => r.slug === 'oncrew'));
      assert.deepEqual(a, b);
      const op = { industry, calls, minutes: 3, cost: 400 };
      assert.deepEqual(checkOverpaying(vendors, models, op), checkOverpaying(withoutReferral, models, op));
    }
  }
});

test('price source links never point at the referral URL', () => {
  for (const v of vendors) {
    for (const s of v.sources || []) assert.notEqual(s, v.referral_url);
  }
  const provider = (models.providers || []).find((p) => p.slug === 'oncrew');
  for (const s of provider?.sources || []) assert.notEqual(s.href, REF);
  const quote = quoteDirectory(vendors, models, { industry: 'all', calls: 150, minutes: 3, afterHours: null });
  for (const row of [...quote.priced, ...quote.missing]) assert.notEqual(row.sourceHref, REF);
  assert.notEqual(vendorOffer(oncrew)?.url, REF);
  assert.ok(!JSON.stringify(models).includes(REF));
});

test('the vendor page uses the helper and shows the disclosure next to the link', () => {
  const page = read('src/pages/vendors/[slug].astro');
  assert.match(page, /outboundLink\(v\)/);
  assert.match(page, /rel=\{outbound\.rel\}/);
  assert.match(page, /REFERRAL_NOTE/);
  assert.doesNotMatch(page, /href=\{v\.website\}/);
  assert.match(page, /v\.sources\.map\(\(s\) => <li><a href=\{s\}/);
  assert.match(REFERRAL_NOTE, /never affects rankings or prices/);
});

test('terms and about disclose referral links', () => {
  assert.match(read('src/pages/terms.astro'), /id="referral"[\s\S]*never affect rankings, listings, verified prices, or the order of results/);
  assert.match(read('src/pages/about.astro'), /referral links[\s\S]*never affect rankings/);
});
