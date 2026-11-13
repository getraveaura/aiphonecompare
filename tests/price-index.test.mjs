import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifySource, indexRows, indexSummary, introSentences, hostOf, SOURCE_TYPES } from '../src/lib/price-index.mjs';
import { AI_BOTS, renderRobots, pickLastmod, toDay } from '../src/lib/seo-files.mjs';

const vendors = JSON.parse(fs.readFileSync('src/data/vendors.json', 'utf8'));
const log = JSON.parse(fs.readFileSync('src/data/price-changes.json', 'utf8'));

test('every vendor appears exactly once with verbatim price text', () => {
  const rows = indexRows(vendors);
  assert.equal(rows.length, vendors.length);
  assert.equal(new Set(rows.map((r) => r.slug)).size, vendors.length);
  for (const v of vendors) {
    const r = rows.find((x) => x.slug === v.slug);
    assert.equal(r.startingPrice, v.starting_price || '');
    assert.equal(r.lastChecked, v.last_checked || '');
  }
});

test('source type classification', () => {
  assert.equal(hostOf('https://www.smith.ai/pricing'), 'smith.ai');
  assert.equal(classifySource('https://smith.ai/pricing', 'https://smith.ai'), SOURCE_TYPES.vendor);
  assert.equal(classifySource('https://help.smith.ai/x', 'https://www.smith.ai'), SOURCE_TYPES.vendor);
  assert.equal(classifySource('https://justcall.io/blog/x', 'https://smith.ai'), SOURCE_TYPES.third);
  assert.equal(classifySource('https://notsmith.ai/x', 'https://smith.ai'), SOURCE_TYPES.third);
  assert.equal(classifySource('https://justcall.io/blog/x', ''), SOURCE_TYPES.unknown);
  assert.equal(classifySource('', 'https://smith.ai'), SOURCE_TYPES.none);
});

test('summary counts match the data', () => {
  const s = indexSummary(vendors, log);
  assert.equal(s.listed, vendors.length);
  assert.equal(s.withPrice, vendors.filter((v) => /\$\d/.test(v.starting_price || '')).length);
  assert.equal(s.withPrice + s.withoutPrice, s.listed);
  assert.equal(s.vendorSource + s.thirdPartySource + s.unclassifiedSource + s.noSource, s.listed);
  assert.equal(s.changes, log.changes.length);
  const intro = introSentences(s).join(' ');
  assert.match(intro, new RegExp(`${s.withPrice} AI receptionists`));
  assert.match(intro, new RegExp(`out of ${s.listed} listed`));
});

test('robots allows every required AI and search crawler', () => {
  const txt = renderRobots(AI_BOTS, 'https://aiphonecompare.com');
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Bingbot', 'Claude-SearchBot', 'Perplexity-User']) {
    assert.match(txt, new RegExp(`User-agent: ${bot}\\nAllow: /`));
  }
  assert.match(txt, /^User-agent: \*\nAllow: \//);
  assert.doesNotMatch(txt, /Disallow/);
  assert.match(txt, /Sitemap: https:\/\/aiphonecompare\.com\/sitemap\.xml/);
});

test('lastmod: meta first, then newest JSON-LD dateModified, then fallback', () => {
  const ld = (d) => `<script type="application/ld+json">${JSON.stringify({ '@graph': [{ dateModified: d }, { x: { dateModified: '2026-01-01' } }] })}</script>`;
  assert.equal(pickLastmod(`<meta property="article:modified_time" content="2026-11-10T00:00:00Z">${ld('2026-11-12')}`, '2026-11-01'), '2026-11-10');
  assert.equal(pickLastmod(ld('2026-11-12'), '2026-11-01'), '2026-11-12');
  assert.equal(pickLastmod('<p>none</p>', '2026-11-01'), '2026-11-01');
  assert.equal(toDay('2026-02-30'), '');
});
