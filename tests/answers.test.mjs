import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { vendorSummary, industrySummary, compareSummary, productNode, articleNode, sourceLinks } from '../src/lib/answers.mjs';
import { buildLandings, costHubSummary } from '../src/lib/landings.mjs';

const vendors = JSON.parse(fs.readFileSync('src/data/vendors.json', 'utf8'));
const log = JSON.parse(fs.readFileSync('src/data/price-changes.json', 'utf8'));
const models = JSON.parse(fs.readFileSync('src/data/cost-models.json', 'utf8'));
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d+)?/g) || [];

test('every vendor summary is 2–3 sentences and its dollar amounts come from that vendor record or its logged change', () => {
  for (const v of vendors) {
    const s = vendorSummary(v, log.changes);
    assert.ok(s.length >= 2 && s.length <= 3, v.slug);
    for (const line of s) assert.ok(line.trim().length > 10, v.slug);
    const own = JSON.stringify(v) + JSON.stringify(log.changes.filter((c) => c.vendorSlug === v.slug));
    for (const amount of dollars(s.join(' '))) assert.ok(own.includes(amount), `${v.slug}: ${amount} not in its data`);
  }
});

test('missing fields are said to be unverified, not filled in', () => {
  const s = vendorSummary({ slug: 'x', name: 'X', industries: [] }, []).join(' ');
  assert.match(s, /No starting price is verified for X/);
  assert.match(s, /free trial: not verified/);
  assert.match(s, /HIPAA\/BAA: not stated/);
  assert.doesNotMatch(s, /\$\d/);
});

test('industry summary counts match the data', () => {
  const dental = vendors.filter((v) => v.industries.includes('dental'));
  const s = industrySummary({ key: 'dental', vendors: dental, priceSentence: 'P.' });
  assert.match(s[0], new RegExp(`lists ${dental.length} AI receptionists`));
  const stated = dental.filter((v) => v.hipaa_baa && !/^not stated/i.test(v.hipaa_baa)).length;
  assert.match(s[1], new RegExp(`^${stated} of ${dental.length}`));
});

test('compare summary does not price a vendor outside the cost model', () => {
  const smith = vendors.find((v) => v.slug === 'smith-ai');
  const ruby = vendors.find((v) => v.slug === 'ruby');
  const s = compareSummary({ left: smith, right: ruby, providers: models.providers.filter((p) => p.slug === 'smith-ai'), rangeAt: () => 'At 150 calls a month, X.' }).join(' ');
  assert.match(s, /Ruby is not in our cost model yet/);
  assert.ok(s.includes(ruby.starting_price));
});

test('landing summaries only use dollar amounts already on the page', () => {
  for (const page of buildLandings()) {
    assert.ok(page.summary.length >= 1 && page.summary.length <= 4, page.path);
    for (const amount of dollars(page.summary.join(' '))) {
      assert.ok(page.dollars.includes(amount), `${page.path}: ${amount}`);
    }
  }
  const hub = costHubSummary(models).join(' ');
  assert.match(hub, new RegExp(`^${models.providers.length} providers`));
});

test('Product offers use only numeric published plan fees from the cost model', () => {
  for (const v of vendors) {
    const provider = models.providers.find((p) => p.slug === v.slug);
    const node = productNode({ vendor: v, provider, checked: models.checked, url: 'https://aiphonecompare.com/x/' });
    if (!provider) { assert.equal(node, null); continue; }
    const nums = provider.plans.map((p) => p.publishedMonthly).filter((n) => typeof n === 'number');
    assert.equal(node.offers.lowPrice, Math.min(...nums));
    assert.equal(node.offers.highPrice, Math.max(...nums));
    assert.equal(node.offers.url, provider.sources[0].href);
    assert.equal(node.aggregateRating, undefined);
    assert.equal(node.review, undefined);
  }
});

test('Article node carries dateModified and https citations only', () => {
  const a = articleNode({ url: 'https://aiphonecompare.com/a/', headline: 'H', description: 'D', modified: '2026-11-04', citations: ['https://x.com/', 'http://y.com/', 'https://x.com/'] });
  assert.equal(a['@type'], 'Article');
  assert.equal(a.dateModified, '2026-11-04');
  assert.deepEqual(a.citation, ['https://x.com/']);
  assert.equal(sourceLinks(['https://a.com/1', 'https://a.com/2'])[1].label, 'a.com (2)');
});
