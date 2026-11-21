import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildBestGuides, bestPathForIndustry } from '../src/lib/best-guides.mjs';
import vendors from '../src/data/vendors.json' with { type: 'json' };

const pages = buildBestGuides();
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d{2})?/g) || [];
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('industry guides have distinct paths and do not claim a ranking', () => {
  assert.deepEqual(pages.slice(0, 4).map((page) => page.path), [
    '/best/dentists/',
    '/best/law-firms/',
    '/best/med-spas/',
    '/best/hvac-plumbing/',
  ]);
  assert.deepEqual(pages.map((page) => page.path), [
    '/best/dentists/',
    '/best/law-firms/',
    '/best/med-spas/',
    '/best/hvac-plumbing/',
    '/best/veterinarians/',
    '/best/roofing/',
    '/best/chiropractors/',
    '/best/property-management/',
    '/best/auto-repair/',
    '/best/salons/',
  ]);
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
  for (const page of pages) {
    assert.ok(page.h1);
    assert.ok(page.description.length > 40);
    assert.match(page.lede, /not a ranked list/i);
    assert.ok(page.faqs.some((item) => /does not pick a winner|not a ranked list|Are these tools ranked/i.test(`${item.q} ${item.a}`)));
    assert.ok(page.related.some((link) => link.href === page.dfyPath));
    assert.ok(page.related.some((link) => link.href === '/audit/'));
    assert.ok(page.related.some((link) => link.href.startsWith('/cost/calculator/')));
    assert.ok(page.related.some((link) => link.href === '/cost/' || link.href.startsWith('/cost/')));
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

test('the veterinary guide lists only Weave and does not invent a vet directory', () => {
  const page = pages.find((item) => item.path === '/best/veterinarians/');
  assert.ok(page);
  assert.match(page.scope, /does not keep a veterinary vendor directory/i);
  assert.deepEqual(page.vendors.map((vendor) => vendor.slug), ['weave']);
  assert.match(page.scope, /\$199\/mo/);
  assert.match(page.scope, /no published price/i);
  assert.equal(page.dfyPath, '/done-for-you/');
  assert.ok(!page.industryPath);
});

test('the roofing guide is honest about using the home-services directory', () => {
  const page = pages.find((item) => item.path === '/best/roofing/');
  assert.ok(page);
  assert.match(page.scope, /does not keep a separate roofing vendor directory/i);
  assert.equal(page.industryKey, 'plumbing');
  assert.equal(page.dfyPath, '/done-for-you/home-services/');
  assert.equal(page.vendors.length, vendors.filter((vendor) => vendor.industries?.includes('plumbing')).length);
  assert.ok(page.related.some((link) => link.href === '/stories/truchoice-roofing-after-hours-ai/'));
  assert.ok(page.related.some((link) => link.href === '/cost/missed-call/'));
});

test('the newer industry guides list only vendors with their own industry pages', () => {
  const expected = {
    '/best/chiropractors/': ['agentzap', 'dialzara', 'my-ai-front-desk', 'rosie', 'smith-ai', 'upfirst'],
    '/best/property-management/': ['abby-connect', 'dialzara', 'goodcall', 'marlie-ai', 'my-ai-front-desk', 'nextphone', 'oncrew', 'rosie', 'smith-ai', 'upfirst'],
    '/best/auto-repair/': ['agentzap', 'autoleap-air', 'dialzara', 'justcall', 'my-ai-front-desk', 'nextphone', 'rosie', 'shopmonkey-concierge', 'smith-ai', 'upfirst'],
    '/best/salons/': ['agentzap', 'callpad', 'dialzara', 'glossgenius-reception', 'my-ai-front-desk', 'nextphone', 'rosie', 'upfirst'],
  };
  for (const [path, slugs] of Object.entries(expected)) {
    const page = pages.find((item) => item.path === path);
    assert.ok(page, path);
    assert.match(page.scope, /does not keep a separate .+ directory/i);
    assert.match(page.lede, /not a ranked list/i);
    assert.deepEqual(page.vendors.map((vendor) => vendor.slug), slugs);
    assert.ok(page.vendors.length > 0);
    assert.equal(page.dfyPath, '/done-for-you/');
    assert.ok(page.related.some((link) => link.href === '/done-for-you/'));
    assert.ok(!page.industryPath);
  }
  const salon = pages.find((item) => item.path === '/best/salons/');
  assert.match(salon.scope, /med spas are covered on a separate guide/i);
  assert.ok(salon.related.some((link) => link.href === '/best/med-spas/'));
  const chiro = pages.find((item) => item.path === '/best/chiropractors/');
  assert.match(chiro.scope, /not copied here in full/i);
  const property = pages.find((item) => item.path === '/best/property-management/');
  assert.match(property.scope, /Rent Manager integration page/i);
  assert.equal(property.listChecked, '2026-11-20');
  assert.equal(property.date, '2026-11-20');
  assert.equal(property.findings.listed, 10);
  assert.equal(property.findings.latest, '2026-11-20');
  assert.match(property.answer, /^As of 20 November 2026, \*\*10 AI receptionists\*\* have their own page for property managers/);
  assert.match(property.keyFindings[0], /\*\*10\*\* services have their own page for property managers/);
  assert.equal(property.cite.date, '2026-11-20');
  assert.ok(property.vendors.some((vendor) => vendor.slug === 'oncrew'));
  const auto = pages.find((item) => item.path === '/best/auto-repair/');
  assert.match(auto.scope, /add-on to a Shopmonkey plan/i);
});
