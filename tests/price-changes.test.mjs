import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firstSentence } from '../src/lib/schema.mjs';
import { formatDate } from '../src/lib/stories.mjs';
import {
  priceChangeHeadline, summaryRest, mondayOf, sundayOf, weekRangeLabel, changesByWeek,
} from '../src/lib/price-changes.mjs';
import { renderPriceFeed } from '../src/lib/feed.mjs';

const log = JSON.parse(fs.readFileSync('src/data/price-changes.json', 'utf8'));

test('headlines are the first sentence of each logged summary, nothing added', () => {
  assert.equal(log.changes.length, 8);
  for (const change of log.changes) {
    const headline = priceChangeHeadline(change);
    assert.equal(headline, firstSentence(change.summary));
    assert.ok(change.summary.startsWith(headline));
    const rest = summaryRest(change.summary);
    if (rest) assert.equal(`${headline} ${rest}`, change.summary);
  }
});

test('logged changes are grouped by week, with the first four in 9–15 November 2026', () => {
  assert.equal(mondayOf('2026-11-09'), '2026-11-09');
  assert.equal(mondayOf('2026-11-14'), '2026-11-09');
  assert.equal(mondayOf('2026-11-15'), '2026-11-09');
  assert.equal(mondayOf('2026-11-16'), '2026-11-16');
  assert.equal(sundayOf('2026-11-09'), '2026-11-15');
  assert.equal(weekRangeLabel('2026-11-09', formatDate), '9–15 November 2026');
  const weeks = changesByWeek(log, { todayIso: '2026-11-14' });
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].monday, '2026-11-16');
  assert.equal(weeks[0].isThisWeek, false);
  assert.deepEqual(weeks[0].changes.map((c) => c.id), [
    'smith-ai-pro-monthly-totals-printed',
    'oncrew-business-plan-name',
    'jobber-ai-receptionist-addon-99',
    'oncrew-minutes-and-overage-rates',
  ]);
  assert.equal(weeks[1].monday, '2026-11-09');
  assert.equal(weeks[1].isThisWeek, true);
  assert.deepEqual(weeks[1].changes.map((c) => c.id), [
    'abby-connect-ai-plans-merged',
    'viva-ai-unlimited-plan-added',
    'oncrew-per-call-to-per-minute',
    'agentzap-per-call-to-per-minute',
  ]);
  const later = changesByWeek(log, { todayIso: '2026-11-16' });
  assert.equal(later[0].monday, '2026-11-16');
  assert.equal(later[0].isThisWeek, true);
  assert.equal(later[1].isThisWeek, false);
});

function escXml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  }[char]));
}

test('the price-change RSS feed lists each logged change with its summary', () => {
  const xml = renderPriceFeed({
    changes: log,
    site: 'https://aiphonecompare.com',
    updated: '2026-11-14',
  });
  assert.match(xml, /<title>aiphonecompare price changes<\/title>/);
  assert.match(xml, /<link>https:\/\/aiphonecompare\.com\/price-changes\/<\/link>/);
  for (const change of log.changes) {
    assert.match(xml, new RegExp(`<link>https://aiphonecompare\\.com/price-changes/${change.id}/</link>`));
    assert.ok(xml.includes(`<title>${escXml(priceChangeHeadline(change))}</title>`));
    assert.ok(xml.includes(escXml(change.summary.slice(0, 40))));
  }
});

test('the log page, homepage and footer point to the weekly log and its feed', () => {
  const page = fs.readFileSync('src/pages/price-changes/index.astro', 'utf8');
  const home = fs.readFileSync('src/pages/index.astro', 'utf8');
  const layout = fs.readFileSync('src/layouts/Base.astro', 'utf8');
  assert.match(page, /\/price-changes\/feed\.xml/);
  assert.match(page, /priceChangeHeadline/);
  assert.match(page, /change\.sources/);
  assert.match(home, /\/price-changes\//);
  assert.match(home, /\/price-changes\/feed\.xml/);
  assert.match(layout, /href="\/price-changes\/"/);
  assert.match(layout, /href="\/price-changes\/feed\.xml"/);
});
