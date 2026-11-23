import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  marketFindings, marketAnswer, costAnswer, costDescription, marketFindingsList,
  cheapestAt, addOnAt, countedPrices, SELF_BUILD, citeText, lowerMedian, formatCheckedSpan,
} from '../src/lib/quotable.mjs';
import { buildBestGuides } from '../src/lib/best-guides.mjs';
import { SEND_NOW } from '../src/lib/analytics.mjs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d{2})?/g) || [];

test('market median is a real published price and half start at or below it', () => {
  const f = marketFindings();
  const amounts = countedPrices().map((row) => row.status.amount);
  assert.ok(amounts.includes(f.median));
  assert.equal(f.median, lowerMedian(amounts));
  assert.ok(amounts.filter((n) => n <= f.median).length >= amounts.length / 2);
  assert.equal(f.under50, amounts.filter((n) => n <= 50).length);
  assert.equal(f.counted, amounts.length);
});

test('small-business plan examples leave out self-build developer platforms', () => {
  const rows = cheapestAt();
  assert.ok(rows.length > 0);
  for (const row of rows) assert.ok(!SELF_BUILD.has(row.slug), row.slug);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].cents <= rows[i].cents);
});

test('Jobber add-on is not treated as a complete plan with fully published pricing', () => {
  const rows = cheapestAt();
  assert.ok(rows.length > 0);
  assert.ok(!rows.some((row) => row.slug === 'jobber-ai-receptionist'));
  const addons = addOnAt();
  assert.equal(addons.length, 1);
  assert.equal(addons[0].slug, 'jobber-ai-receptionist');
  assert.equal(addons[0].cents, 13850);
  const f = marketFindings();
  const list = marketFindingsList(f).join('\n');
  const complete = list.split('\n').find((line) => /fully published pricing/.test(line));
  assert.ok(complete, list);
  assert.doesNotMatch(complete, /Jobber|\$138\.50|Ruby|\$1,635/);
  assert.match(complete, /\$99 to \$449 a month/);
  assert.match(complete, /Live receptionist plans are not in that range/);
  assert.match(complete, /plan prices checked 22–23 November 2026/);
  assert.match(list, /The Jobber AI Receptionist add-on is \*\*\$138\.50\*\* a month at 150 conversations/);
  assert.match(list, /a Jobber software plan is not included/);
  assert.match(list, /yearly price and setup are not published \(checked 22 November 2026\)/);
  const cost = costAnswer(f);
  assert.doesNotMatch(cost, /\$138\.50|\$1,635|Ruby/);
  assert.match(cost, /\$99 to \$449 a month/);
  assert.match(cost, /150 calls of 3 minutes/);
  const costPage = read('src/pages/cost.astro');
  assert.match(costPage, /Ruby is a live receptionist/);
  assert.match(costPage, /href="\/cost\/ai-vs-live-receptionist\/"/);
  const d = costDescription();
  assert.doesNotMatch(d, /\$138\.50|\$1,635/);
  assert.ok(d.length <= 160, `${d.length}: ${d}`);
});

test('formatCheckedSpan uses each provider\'s real check date and does not invent one', () => {
  assert.equal(formatCheckedSpan(['2026-11-06']), '6 November 2026');
  assert.equal(formatCheckedSpan(['2026-11-20', '2026-11-06', '2026-11-06']), '6–20 November 2026');
  assert.equal(formatCheckedSpan(['2026-11-20', '2026-12-02']), '20 November 2026 to 2 December 2026');
});

test('the /cost/ meta description leads with small-business monthly costs, not a developer-tool range', () => {
  const d = costDescription();
  assert.ok(d.length <= 160, `${d.length}: ${d}`);
  assert.match(d, /^What an AI receptionist costs per month/);
  assert.doesNotMatch(d, /ElevenLabs|Bland|\$34\.80|\$990/);
  const cost = read('src/pages/cost.astro');
  assert.match(cost, /const description = costDescription\(\)/);
  assert.match(cost, /<QuickAnswer text=\{costAnswer\(market\)\} \/>/);
  assert.match(cost, /<KeyFindings /);
});

test('dated answers open with "As of" and carry a number', () => {
  for (const text of [marketAnswer(), costAnswer()]) {
    assert.match(text, /^As of \d{1,2}(?:–\d{1,2})? \w+ 20\d\d, /);
    assert.ok(dollars(text).length > 0);
  }
  assert.ok(marketFindingsList().length >= 4);
  assert.match(citeText({ title: 'T', url: 'https://aiphonecompare.com/x/', date: '2026-11-14' }), /^aiphonecompare, "T", updated 14 November 2026, https:\/\/aiphonecompare\.com\/x\/$/);
});

test('homepage, /cost/, /price-index/ and best guides show Key findings and How to cite', () => {
  const box = read('src/components/KeyFindings.astro');
  assert.match(box, /How to cite this page:/);
  for (const file of ['src/pages/index.astro', 'src/pages/cost.astro', 'src/pages/price-index/index.astro', 'src/components/BestGuide.astro']) {
    const src = read(file);
    assert.match(src, /<QuickAnswer /, file);
    assert.match(src, /<KeyFindings/, file);
    assert.match(src, /cite=\{/, file);
  }
});

test('strengthened industry guides answer first, with demo questions, cost FAQ and only sourced dollars', () => {
  const pages = buildBestGuides();
  for (const slug of ['chiropractors', 'salons', 'auto-repair', 'property-management']) {
    const page = pages.find((p) => p.slug === slug);
    assert.ok(page.audience, slug);
    assert.match(page.answer, /^As of \d{1,2} \w+ 20\d\d, \*\*\d+ AI receptionists\*\*/);
    assert.equal(page.demoQuestions.length, 5);
    assert.ok(page.faqs[0].q.startsWith('How much does an AI receptionist cost for'));
    assert.ok(page.faqs.some((f) => /ranked/i.test(f.q)));
    assert.ok(page.description.length <= 160, `${slug}: ${page.description.length}`);
    assert.ok(page.checks.length >= 5);
    const blob = `${page.answer} ${page.keyFindings.join(' ')} ${page.faqs.map((f) => f.a).join(' ')} ${page.description} ${page.title}`;
    for (const amount of dollars(blob)) assert.ok(page.dollars.includes(amount), `${slug} uses ${amount} outside sourced figures`);
  }
  for (const page of pages) {
    assert.ok(page.keyFindings.length >= 1, page.slug);
    assert.ok(page.cite.url.endsWith(page.path));
  }
});

test('landing pages carry the tracked setup card with a page-specific source', () => {
  const expect = {
    'src/components/BestGuide.astro': /source=\{`best_\$\{page\.slug\}`\}/,
    'src/pages/best/under-[amount].astro': /source=\{`best_under_\$\{page\.amount\}`\}/,
    'src/pages/vendors/[slug].astro': /source=\{`vendor_\$\{v\.slug\}`\}/,
    'src/pages/alternatives/[slug].astro': /source=\{`alternatives_\$\{t\.slug\}`\}/,
    'src/pages/stories/[slug].astro': /source=\{`story_\$\{story\.slug\}`\}/,
  };
  for (const [file, re] of Object.entries(expect)) {
    const src = read(file);
    assert.match(src, /import SetupNextStep from/, file);
    assert.match(src, re, file);
  }
});

test('navigating clicks are sent right away so the event is not lost on page unload', () => {
  assert.deepEqual(SEND_NOW, { send_instantly: true, transport: 'sendBeacon' });
  const src = read('src/lib/analytics.mjs');
  assert.match(src, /if \(hit\) track\(hit\.event, hit\.properties, SEND_NOW\)/);
  assert.match(src, /window\.posthog\?\.capture\?\.\(event, payload, options\)/);
});
