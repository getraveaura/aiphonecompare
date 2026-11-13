import { test } from 'node:test';
import assert from 'node:assert/strict';
import vendors from '../src/data/vendors.json' with { type: 'json' };
import { activeSpotlight, isSponsored, orderForIndustry, sponsoredLabel } from '../src/lib/spotlight.mjs';
import { matchVendors } from '../src/lib/match.mjs';

const spot = { industry: 'dental', start: '2026-11-01', end: '2026-11-30' };
const v = (slug, extra = {}) => ({ slug, name: slug[0].toUpperCase() + slug.slice(1), industries: ['dental', 'legal'], ...extra });

test('active only on the matching industry', () => {
  const zed = v('zed', { spotlight: spot });
  assert.equal(activeSpotlight(zed, 'dental', '2026-11-13'), true);
  assert.equal(activeSpotlight(zed, 'legal', '2026-11-13'), false);
  assert.equal(activeSpotlight(zed, '', '2026-11-13'), false);
});

test('inactive before start and after end, active on both end dates', () => {
  const zed = v('zed', { spotlight: spot });
  assert.equal(activeSpotlight(zed, 'dental', '2026-10-31'), false);
  assert.equal(activeSpotlight(zed, 'dental', '2026-11-01'), true);
  assert.equal(activeSpotlight(zed, 'dental', '2026-11-30'), true);
  assert.equal(activeSpotlight(zed, 'dental', '2026-12-01'), false);
  assert.equal(isSponsored(zed, '2026-12-01'), false);
  assert.equal(isSponsored(zed, '2026-11-13'), true);
});

test('a malformed spotlight is never active', () => {
  assert.equal(activeSpotlight(v('a', { spotlight: { industry: 'dental', start: '2026-11-30', end: '2026-11-01' } }), 'dental', '2026-11-13'), false);
  assert.equal(activeSpotlight(v('a', { spotlight: { industry: 'dental', start: 'soon' , end: '2026-11-30' } }), 'dental', '2026-11-13'), false);
  assert.equal(activeSpotlight(v('a', { spotlight: true }), 'dental', '2026-11-13'), false);
});

test('spotlight vendor goes first only on its own industry page', () => {
  const list = [v('alpha'), v('zed', { spotlight: spot }), v('bravo')];
  const today = '2026-11-13';
  assert.deepEqual(orderForIndustry(list, 'dental', today).map((x) => x.slug), ['zed', 'alpha', 'bravo']);
  assert.deepEqual(orderForIndustry(list, 'legal', today).map((x) => x.slug), ['alpha', 'bravo', 'zed']);
  assert.equal(sponsoredLabel(list[1], 'dental', today), true);
  assert.equal(sponsoredLabel(list[1], 'legal', today), false);
  assert.equal(sponsoredLabel(list[1], '', today), true);
});

test('an expired spotlight falls back to alphabetical order', () => {
  const list = [v('alpha'), v('zed', { spotlight: spot })];
  assert.deepEqual(orderForIndustry(list, 'dental', '2026-12-01').map((x) => x.slug), ['alpha', 'zed']);
});

test('the legacy sponsored boolean does not reorder or label', () => {
  const list = [v('alpha'), v('zed', { sponsored: true })];
  assert.deepEqual(orderForIndustry(list, 'dental', '2026-11-13').map((x) => x.slug), ['alpha', 'zed']);
  assert.equal(isSponsored(list[1], '2026-11-13'), false);
  assert.equal(sponsoredLabel(list[1], 'dental', '2026-11-13'), false);
});

test('match ranking ignores an active spotlight', () => {
  const base = { industries: ['dental'], starting_price: '', notes: '', integrations: '', human_handoff: '', hipaa_baa: 'Signs a BAA' };
  const rows = [
    { ...base, slug: 'bravo', name: 'Bravo', spotlight: { industry: 'dental', start: '2000-01-01', end: '2999-12-31' } },
    { ...base, slug: 'alpha', name: 'Alpha' },
  ];
  const result = matchVendors(rows, { providers: [] }, { industry: 'dental', mode: 'calls', amount: '10', durationMinutes: '', budget: '', must: { baa: true } });
  assert.deepEqual(result.picks.map((row) => row.slug), ['alpha', 'bravo']);
  assert.deepEqual(result.sponsored.map((row) => row.slug), ['bravo']);
});

test('spotlight fields in vendors.json are well formed', () => {
  for (const vendor of vendors) {
    if (vendor.spotlight == null) continue;
    const s = vendor.spotlight;
    assert.ok(vendor.industries.includes(s.industry), `${vendor.slug}: spotlight industry must be one of its industries`);
    assert.match(s.start, /^\d{4}-\d{2}-\d{2}$/, `${vendor.slug}: start`);
    assert.match(s.end, /^\d{4}-\d{2}-\d{2}$/, `${vendor.slug}: end`);
    assert.ok(s.start <= s.end, `${vendor.slug}: start after end`);
    if (s.href != null) assert.match(s.href, /^https:\/\//, `${vendor.slug}: href must be https`);
    if (s.line != null) assert.ok(typeof s.line === 'string' && s.line.length <= 140, `${vendor.slug}: line`);
  }
});
