import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  ALTERNATIVE_TARGETS, BUDGETS, alternativesTargets, buildAlternatives, buildBudget, getAlternatives, getBudgets,
} from '../src/lib/alternatives.mjs';
import { KIND, money, priceStatus } from '../src/lib/starting-price.mjs';
import vendors from '../src/data/vendors.json' with { type: 'json' };
import plans from '../src/data/price-plans.json' with { type: 'json' };

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d{2})?/g) || [];
const bySlug = Object.fromEntries(vendors.map((v) => [v.slug, v]));
const alternatives = getAlternatives();
const budgets = getBudgets();

test('alternatives pages exist for every requested vendor that is in the directory', () => {
  const present = ALTERNATIVE_TARGETS.filter((slug) => bySlug[slug]);
  assert.deepEqual(alternativesTargets(), present);
  assert.deepEqual(alternatives.map((p) => p.path), present.map((slug) => `/alternatives/${slug}/`));
  assert.equal(buildAlternatives('not-a-vendor'), null);
  for (const page of alternatives) {
    assert.match(page.h1, /^.+ alternatives \(checked \d{1,2} [A-Z][a-z]{2} \d{4}\)$/);
    assert.ok(page.count > 0);
    assert.ok(!page.rows.some((r) => r.vendor.slug === page.slug), 'a vendor is never its own alternative');
    assert.equal(new Set(page.rows.map((r) => r.vendor.slug)).size, page.rows.length, 'each vendor appears once');
    assert.ok(page.faqs.length >= 3);
  }
});

test('every "starts at" amount is written in that vendor\'s own starting price text', () => {
  const rows = [...alternatives.flatMap((p) => [p.target, ...p.rows]), ...budgets.flatMap((b) => [...b.listed, ...b.addons])];
  for (const r of rows) {
    if (r.status.amount == null) continue;
    assert.ok(r.vendor.starting_price.includes(money(r.status.amount)), `${r.vendor.slug}: ${money(r.status.amount)} not in "${r.vendor.starting_price}"`);
  }
});

test('a price not read on the vendor\'s own site is never counted', () => {
  for (const v of vendors) {
    const s = priceStatus(v, plans);
    if (!['confirmed', 'changed'].includes(v.price_check?.result) || !/\$\d/.test(v.starting_price || '')) {
      assert.equal(s.kind, KIND.notPublished, v.slug);
      assert.equal(s.counted, false, v.slug);
      assert.equal(s.display, 'Not published');
    }
  }
});

test('budget lists follow the rule: own-site monthly plan at or under the cap, cheapest first, ties alphabetical', () => {
  assert.deepEqual(budgets.map((b) => b.path), BUDGETS.map((n) => `/best/under-${n}/`));
  for (const b of budgets) {
    for (const r of b.listed) {
      assert.equal(r.status.kind, KIND.monthly, r.vendor.slug);
      assert.ok(r.status.amount <= b.amount, `${r.vendor.slug} over ${b.amount}`);
    }
    for (let i = 1; i < b.listed.length; i++) {
      const [a, c] = [b.listed[i - 1], b.listed[i]];
      assert.ok(a.status.amount < c.status.amount || (a.status.amount === c.status.amount && a.vendor.name.localeCompare(c.vendor.name) <= 0), `${a.vendor.slug} before ${c.vendor.slug}`);
    }
    assert.ok(b.addons.every((r) => r.status.kind === KIND.addon));
    assert.ok(b.notCounted.every((r) => !r.status.counted && r.status.short));
  }
  // Larger budgets include everything in smaller ones.
  for (let i = 1; i < budgets.length; i++) {
    const bigger = new Set(budgets[i].listed.map((r) => r.vendor.slug));
    assert.ok(budgets[i - 1].listed.every((r) => bigger.has(r.vendor.slug)));
  }
});

test('page copy only uses dollar amounts from the vendor records or the budget itself', () => {
  for (const page of alternatives) {
    const allowed = [page.target, ...page.rows].map((r) => r.vendor.starting_price || '').join(' ');
    for (const amount of dollars(`${page.summary.join(' ')} ${page.faqs.map((f) => f.a).join(' ')} ${page.description}`)) {
      assert.ok(allowed.includes(amount), `${page.path} uses ${amount}`);
    }
  }
  for (const b of budgets) {
    const allowed = `${money(b.amount)} ${b.listed.map((r) => r.vendor.starting_price).join(' ')}`;
    for (const amount of dollars(`${b.summary.join(' ')} ${b.faqs.map((f) => f.a).join(' ')} ${b.description} ${b.rule.join(' ')}`)) {
      assert.ok(allowed.includes(amount), `${b.path} uses ${amount}`);
    }
  }
});

test('a sponsored spotlight is labeled but never moves a vendor up', () => {
  const today = new Date().toISOString().slice(0, 10);
  const sponsoredSlug = 'zinng-ai';
  const list = vendors.map((v) => (v.slug === sponsoredSlug ? { ...v, spotlight: { industry: 'dental', start: '2000-01-01', end: '2999-12-31' } } : v));
  const before = buildBudget(50).listed.map((r) => r.vendor.slug);
  const after = buildBudget(50, list, plans);
  assert.deepEqual(after.listed.map((r) => r.vendor.slug), before);
  assert.ok(after.listed.find((r) => r.vendor.slug === sponsoredSlug).sponsored, `spotlight active on ${today}`);
  const alt = buildAlternatives('goodcall', list, plans);
  assert.deepEqual(alt.rows.map((r) => r.vendor.slug), buildAlternatives('goodcall').rows.map((r) => r.vendor.slug));
});

test('vendor pages link to their alternatives page, and discovery files list the new pages', () => {
  const vendorPage = read('src/pages/vendors/[slug].astro');
  assert.match(vendorPage, /hasAlternativesPage\(v\.slug\)/);
  assert.match(vendorPage, /alternativesPath\(v\.slug\)/);
  const postbuild = read('postbuild.mjs');
  assert.match(postbuild, /## Alternatives/);
  assert.match(postbuild, /## Best by budget/);
  assert.match(postbuild, /missing from the sitemap \/ IndexNow list/);
  assert.match(read('src/layouts/Base.astro'), /href="\/alternatives\/"/);
  assert.match(read('src/pages/best/index.astro'), /getBudgets/);
});
