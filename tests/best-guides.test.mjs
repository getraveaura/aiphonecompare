import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildBestGuides, bestPathForIndustry } from '../src/lib/best-guides.mjs';
import vendors from '../src/data/vendors.json' with { type: 'json' };

const pages = buildBestGuides();
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d{2})?/g) || [];
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('four industry guides have distinct paths and do not claim a ranking', () => {
  assert.equal(pages.length, 4);
  assert.deepEqual(pages.map((page) => page.path), [
    '/best/dentists/',
    '/best/law-firms/',
    '/best/med-spas/',
    '/best/hvac-plumbing/',
  ]);
  for (const page of pages) {
    assert.ok(page.h1);
    assert.ok(page.description.length > 40);
    assert.match(page.lede, /not a ranked list/i);
    assert.ok(page.faqs.some((item) => /does not pick a winner|not a ranked list|Are these tools ranked/i.test(`${item.q} ${item.a}`)));
    assert.ok(page.related.some((link) => link.href === page.dfyPath));
    assert.ok(page.related.some((link) => link.href === '/audit/'));
    assert.ok(page.related.some((link) => link.href.startsWith('/cost/calculator/')));
    assert.ok(page.vendors.length > 0);
  }
});

test('guide dollar amounts come from the directory or the matching cost page', () => {
  for (const page of pages) {
    const blob = `${page.summary.join(' ')} ${page.faqs.map((item) => item.a).join(' ')} ${page.description}`;
    for (const amount of dollars(blob)) {
      assert.ok(page.dollars.includes(amount), `${page.path} uses ${amount} outside sourced figures`);
    }
  }
});

test('the med-spa guide is honest about using the medical directory', () => {
  const page = pages.find((item) => item.path === '/best/med-spas/');
  assert.match(page.scope, /does not keep a separate med-spa vendor directory/i);
  assert.equal(page.industryKey, 'medical');
  assert.equal(page.dfyPath, '/done-for-you/med-spa/');
  assert.equal(page.vendors.length, vendors.filter((vendor) => vendor.industries?.includes('medical')).length);
});

test('industry pages can link to the matching guide', () => {
  assert.equal(bestPathForIndustry('dental').href, '/best/dentists/');
  assert.equal(bestPathForIndustry('legal').href, '/best/law-firms/');
  assert.equal(bestPathForIndustry('plumbing').href, '/best/hvac-plumbing/');
  assert.equal(bestPathForIndustry('medical').href, '/best/med-spas/');
  assert.equal(bestPathForIndustry('other'), null);
  const industry = read('src/components/Industry.astro');
  assert.match(industry, /bestPathForIndustry/);
  assert.match(read('src/pages/index.astro'), /getBestGuides/);
  assert.match(read('src/layouts/Base.astro'), /href="\/best\/"/);
});
