import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { priceView, planEntry, unsupportedNumbers, numbersIn, splitMoney, textLines, shortDate } from '../src/lib/plans.mjs';
import { lowestMonthly } from '../src/lib/price.mjs';

const vendors = JSON.parse(fs.readFileSync('src/data/vendors.json', 'utf8'));
const plans = JSON.parse(fs.readFileSync('src/data/price-plans.json', 'utf8'));
const baseline = JSON.parse(fs.readFileSync('src/data/price-baseline.json', 'utf8'));
const read = (p) => fs.readFileSync(p, 'utf8');
const bySlug = Object.fromEntries(vendors.map((v) => [v.slug, v]));

test('every structured entry belongs to a vendor and matches its starting_price word for word', () => {
  for (const [slug, entry] of Object.entries(plans.vendors)) {
    assert.ok(bySlug[slug], `unknown vendor ${slug}`);
    assert.equal(entry.basis, bySlug[slug].starting_price, `${slug}: basis is stale; update price-plans.json`);
  }
});

test('structured plans never add a number that is not in the published text', () => {
  for (const [slug, entry] of Object.entries(plans.vendors)) {
    assert.deepEqual(unsupportedNumbers(entry), [], slug);
    for (const plan of entry.plans) assert.ok(plan.price, `${slug}: plan without a price`);
  }
});

test('the "From" headline is a monthly amount from the text and not above any monthly plan', () => {
  for (const [slug, entry] of Object.entries(plans.vendors)) {
    if (entry.headline) continue;
    const from = splitMoney(entry.from);
    assert.ok(from.amount, `${slug}: from must start with a dollar amount`);
    const n = Number(from.amount.replace(/[^\d.]/g, ''));
    assert.ok(numbersIn(entry.basis).has(String(n)), `${slug}: ${n} not in text`);
    for (const plan of entry.plans) {
      const m = /\$([\d,]+(?:\.\d+)?)\/mo\b/.exec(plan.price);
      if (m && !/^from /i.test(plan.price)) assert.ok(n <= Number(m[1].replace(/,/g, '')), `${slug}: from ${n} above plan ${plan.price}`);
    }
  }
});

test('structured from-price agrees with the site-wide lowest monthly amount, except known add-on wording', () => {
  const known = new Set(['viva-ai']); // "+$150/mo per added provider" is an add-on, not a plan.
  for (const [slug, entry] of Object.entries(plans.vendors)) {
    if (entry.headline || known.has(slug)) continue;
    const low = lowestMonthly(entry.basis);
    if (low == null) continue;
    const n = Number(splitMoney(entry.from).amount.replace(/[^\d.]/g, ''));
    assert.equal(n, low, slug);
  }
});

test('priceView renders plans, one-time fees and falls back to the original text', () => {
  const abby = priceView(bySlug['abby-connect'], plans);
  assert.equal(abby.kind, 'plans');
  assert.deepEqual([abby.headline.prefix, abby.headline.amount, abby.headline.unit], ['From', '$164', '/mo']);
  assert.deepEqual(abby.plans.map((p) => [p.label, p.price]), [['Starter', '$164/mo'], ['Essential', '$329/mo']]);
  assert.match(abby.plans[0].sub, /50 Abby Minutes/);
  const agentzap = priceView(bySlug.agentzap, plans);
  assert.deepEqual(agentzap.oneTime, [{ label: 'one-time setup', price: '$499' }]);
  const mango = priceView(bySlug['mango-voice-margo'], plans);
  assert.equal(mango.kind, 'text');
  assert.equal(mango.lines.join(' '), bySlug['mango-voice-margo'].starting_price, 'fallback keeps every word');
  assert.equal(priceView({ slug: 'x', starting_price: '' }, plans).kind, 'empty');
});

test('a changed price text drops the stale structure instead of showing old plans', () => {
  const changed = { ...bySlug['abby-connect'], starting_price: 'Starter $199/mo for 50 Abby Minutes' };
  assert.equal(planEntry(changed, plans), null);
  assert.equal(priceView(changed, plans).kind, 'text');
});

test('textLines only splits, never rewrites', () => {
  for (const v of vendors) {
    if (!v.starting_price) continue;
    assert.equal(textLines(v.starting_price).join(' ').replace(/;/g, ''), v.starting_price.replace(/;/g, '').replace(/\s+/g, ' '), v.slug);
  }
  assert.equal(shortDate('2026-11-14'), '14 Nov 2026');
});

test('price snapshot sees no change: baseline text equals vendors.json for every vendor', () => {
  const base = Object.fromEntries(baseline.vendors.map((v) => [v.slug, v]));
  for (const v of vendors) {
    assert.ok(base[v.slug], `${v.slug} missing from baseline`);
    assert.equal(base[v.slug].starting_price, v.starting_price, `${v.slug}: false price change`);
    assert.equal(base[v.slug].last_checked, v.last_checked, `${v.slug}: last_checked drift`);
  }
});

test('price lists use the structured component everywhere prices are shown', () => {
  for (const p of ['src/pages/index.astro', 'src/pages/vendors/index.astro', 'src/pages/vendors/[slug].astro', 'src/components/VendorTable.astro', 'src/components/Landing.astro', 'src/pages/missed-call-calculator.astro']) {
    assert.match(read(p), /<PricePlans\b/, p);
  }
  assert.match(read('src/components/VendorTable.astro'), /class="vt-cards"/, 'phones get cards, not a wide table');
  const cost = read('src/pages/cost.astro');
  assert.match(cost, /class="cost-plans"/);
  assert.match(cost, /-scenario`\}/);
  assert.match(cost, /-formula`\}/);
  assert.doesNotMatch(read('src/pages/index.astro'), /<td data-label="Starting price">\{v\.starting_price/);
});
