import { test } from 'node:test';
import assert from 'node:assert/strict';
import stories from '../src/data/stories.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };
import baseline from '../src/data/price-baseline.json' with { type: 'json' };
import priceLog from '../src/data/price-changes.json' with { type: 'json' };
import { catchGroups, addedThisWeek } from '../src/lib/stories.mjs';
import { questionsFor } from '../src/lib/checklist.mjs';
import { renderFeed } from '../src/lib/feed.mjs';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const vendorSlugs = new Set(vendors.map((vendor) => vendor.slug));
const industries = new Set(['dental', 'medical', 'legal', 'plumbing', 'hvac', 'roofing', 'other']);

function assertSource(source, where) {
  assert.match(source.url, /^https:\/\/\S+$/, where);
  assert.match(source.date, ISO, where);
  assert.ok(source.title, where);
}

test('every story has a source URL and date', () => {
  assert.ok(stories.length >= 16);
  const slugs = new Set();
  for (const story of stories) {
    assert.equal(slugs.has(story.slug), false, story.slug);
    slugs.add(story.slug);
    assert.match(story.added, ISO);
    assert.ok(story.title);
    assert.ok(story.whatTheyDid);
    assert.ok(story.outcome);
    assert.ok(story.industries.length);
    for (const industry of story.industries) assert.ok(industries.has(industry), story.slug);
    if (story.vendorSlug) assert.ok(vendorSlugs.has(story.vendorSlug), story.vendorSlug);
    assert.ok(story.sources.length, story.slug);
    for (const source of story.sources) assertSource(source, story.slug);
    for (const item of story.catches || []) {
      assert.ok(item.id && item.summary, story.slug);
      assert.ok(item.sources.length, item.id);
      for (const source of item.sources) assertSource(source, item.id);
    }
  }
});

test('shared catches count independent source URLs', () => {
  const groups = catchGroups(stories);
  const rejected = groups.find((group) => group.id === 'callers-reject-ai');
  assert.equal(rejected.sources.length, 3);
  const transfer = groups.find((group) => group.id === 'no-transfer-to-person');
  assert.equal(transfer.sources.length, 2);
  assert.equal(catchGroups(stories, { industry: 'roofing' }).some((group) => group.id === 'callers-reject-ai'), false);
  assert.equal(catchGroups(stories, { vendorSlug: 'housecall-pro-csr-ai' }).length, 0);
});

test('new this week uses the added date, not the source date', () => {
  const sample = [
    { added: '2026-11-09', sources: [{ date: '2024-06-27' }] },
    { added: '2026-10-01', sources: [{ date: '2026-11-09' }] },
  ];
  assert.equal(addedThisWeek(sample, '2026-11-09').length, 1);
  assert.equal(addedThisWeek(sample, '2026-11-20').length, 0);
});

test('price baseline matches the current vendor list', () => {
  assert.equal(baseline.recorded, '2026-11-09');
  assert.equal(baseline.vendors.length, vendors.length);
  for (const vendor of vendors) {
    const row = baseline.vendors.find((item) => item.slug === vendor.slug);
    assert.ok(row, vendor.slug);
    assert.equal(row.starting_price, vendor.starting_price || '');
    assert.equal(row.last_checked, vendor.last_checked || '');
  }
});

test('each logged price change has a vendor, a date, and a source', () => {
  assert.match(priceLog.trackingStarted, ISO);
  for (const change of priceLog.changes) {
    assert.ok(vendorSlugs.has(change.vendorSlug));
    assert.match(change.observed, ISO);
    assert.match(change.added, ISO);
    assert.ok(change.before && change.after && change.summary);
    assert.ok(change.sources.length);
    for (const source of change.sources) assertSource(source, change.id);
  }
});

test('the feed lists stories and price changes', () => {
  const xml = renderFeed({
    stories,
    changes: priceLog,
    site: 'https://aiphonecompare.com',
    updated: '2026-11-09',
  });
  assert.match(xml, /<link>https:\/\/aiphonecompare\.com\/stories\/good-guy-plumbing-housecall-pro\/<\/link>/);
  assert.match(xml, /<link>https:\/\/aiphonecompare\.com\/price-changes\/agentzap-per-call-to-per-minute\/<\/link>/);
  assert.match(xml, /<lastBuildDate>2026-11-09<\/lastBuildDate>/);
});

test('the checklist adds a question only for a catch that is present', () => {
  const plain = questionsFor([]);
  const withCatch = questionsFor([{ id: 'spanish-names' }]);
  assert.ok(plain.length >= 8);
  assert.equal(withCatch.length, plain.length + 1);
  assert.match(withCatch.at(-1), /Spanish/);
});
