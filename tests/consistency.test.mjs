import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { quoteDirectory, quoteSummary, servicesWithoutFullBill, shownBill, unpricedBillSentence } from '../src/lib/calculator.mjs';
import { readyRange } from '../src/lib/cost-table.mjs';
import { buildLandings } from '../src/lib/landings.mjs';
import { cheapestAt, costLlmsBlurb, latestVerifiedDate } from '../src/lib/quotable.mjs';
import models from '../src/data/cost-models.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const vsPage = read('src/pages/cost/ai-vs-live-receptionist.astro');

test('the AI vs live range is the same ready-made range as /cost/', () => {
  const range = readyRange(models, 150);
  const rows = cheapestAt(null, 150, models);
  assert.ok(range);
  assert.equal(range.count, rows.length);
  assert.equal(range.count, 15);
  assert.equal(range.lowCents, rows[0].cents);
  assert.equal(range.highCents, rows.at(-1).cents);
  assert.equal(range.lowCents, 9900);
  assert.equal(range.highCents, 44900);
  assert.equal(range.dash, '$99–$449');
  assert.equal(range.prose, '$99 to $449');
  assert.ok(!rows.some((row) => row.slug === 'ruby'));
  assert.match(vsPage, /readyRange\(models, 150\)/);
  assert.match(vsPage, /\{aiRange\.dash\}/);
  assert.doesNotMatch(vsPage, /\$199–\$295/);
  assert.match(vsPage, /const CHECKED = models\.checked/);
  assert.match(vsPage, /modified=\{CHECKED\}/);
  assert.equal(models.checked, '2026-11-22');
});

test('the unpriced count is computed once and reused', () => {
  const input = { industry: 'all', calls: 150, minutes: 3, afterHours: null };
  const quote = quoteDirectory(vendors, models, input);
  const info = servicesWithoutFullBill(vendors, models, input);
  const sentence = unpricedBillSentence(info);
  assert.equal(info.count, quote.missing.length);
  assert.equal(info.count, vendors.length - quote.priced.length);
  assert.match(sentence, new RegExp(`^${info.count} services do not publish enough to finish a monthly bill at 150 calls of 3 minutes\\.$`));
  assert.ok(quoteSummary(quote).includes(sentence));
  assert.ok(costLlmsBlurb().includes(sentence));
  for (const file of ['src/pages/cost.astro', 'src/pages/best/ai-phone-receptionists.astro']) {
    assert.match(read(file), /unpricedBillSentence\(servicesWithoutFullBill/, file);
  }
  assert.doesNotMatch(read('src/pages/cost.astro'), /\b31 services\b/);
  assert.doesNotMatch(read('src/lib/calculator.mjs'), /\b31 say not enough\b/);
  assert.doesNotMatch(read('src/lib/quotable.mjs'), /\b31 services\b/);
});

test('llms.txt last verified follows the newest cost-model check', () => {
  assert.equal(latestVerifiedDate(vendors, models), '2026-11-23');
  assert.equal(latestVerifiedDate(vendors, models) >= '2026-11-20', true);
  const postbuild = read('postbuild.mjs');
  assert.match(postbuild, /latestVerifiedDate\(vendors, costModels\)/);
  assert.match(postbuild, /Last verified: \$\{verified\}/);
  assert.match(postbuild, /Checked through \$\{verified\}/);
});

test('worked calculator totals carry an inline calculation label', () => {
  const quote = quoteDirectory(vendors, models, { industry: 'all', calls: 150, minutes: 3, afterHours: null });
  const ruby = quote.priced.find((row) => row.slug === 'ruby');
  const smith = quote.priced.find((row) => row.slug === 'smith-ai');
  assert.equal(ruby.worked, true);
  assert.equal(ruby.monthly, '$1,635.00');
  assert.equal(shownBill(ruby.monthly, ruby.worked), '$1,635.00 (our calculation)');
  assert.equal(smith.worked, false);
  assert.equal(shownBill(smith.monthly, smith.worked), smith.monthly);
  assert.match(read('src/pages/cost/calculator.astro'), /shownBill\(row\.monthly, row\.worked\)/);
  assert.match(vsPage, /addsExtra\(v\.plan50\) \? ' \(our calculation\)'/);
  assert.match(vsPage, /addsExtra\(v\.plan150\) && <span class="vs-calc">\(our calculation\)<\/span>/);
});

test('Smith.ai vs Ruby uses each row date and the cheapest plan that fits', () => {
  const page = buildLandings().find((item) => item.path === '/compare/smith-ai-vs-ruby/');
  const text = `${page.dateNote} ${page.answer.join(' ')} ${page.blocks.map((block) => block.caption || '').join(' ')}`;
  const sentence = 'Prices checked 14–22 November 2026; each row shows its own date.';
  assert.equal(page.dateNote, sentence);
  assert.equal(page.modified, '2026-11-22');
  assert.match(text, /Prices checked 14–22 November 2026; each row shows its own date\./);
  assert.match(text, /Smith\.ai plans checked 22 November 2026/);
  assert.match(text, /Ruby plans checked 20 November 2026/);
  assert.doesNotMatch(text, /Cost estimates use prices checked 22 November 2026/);
  assert.doesNotMatch(text, /Price checked 14 November 2026/);
  assert.doesNotMatch(text, /Last checked Smith\.ai, 14 November 2026/);
  assert.match(page.answer.join(' '), /the cheapest plan that fits is \$270\.00 for Smith\.ai Pro, 150 calls and \$1,635\.00 for Ruby Call Ruby 350/);
  assert.doesNotMatch(page.answer.join(' '), /\$7,875\.00 for Ruby/);
  const plans = page.blocks.find((block) => /50, 150, and 300 calls/.test(block.caption || ''));
  assert.match(JSON.stringify(plans.rows), /\$7,875/);
  const checked = page.blocks[0].rows.find((row) => row[0].text === 'Price checked');
  assert.equal(checked[1].text, '14–22 November 2026');
  assert.equal(checked[1].datetime, '2026-11-22');
  assert.equal(checked[2].text, '20 November 2026');
  assert.equal(checked[2].datetime, '2026-11-20');
  const pro150 = plans.rows.find((row) => row[1].text === 'Pro, 150 calls');
  const ruby350 = plans.rows.find((row) => row[1].text === 'Call Ruby 350');
  const ruby2500 = plans.rows.find((row) => row[1].text === 'Call Ruby 2,500');
  assert.equal(pro150[3].text, '$270.00');
  assert.equal(ruby350[3].text, '$1,635.00 (our calculation)');
  assert.equal(ruby350[2].text, '$1,210.00');
  assert.equal(ruby2500[4].text, '$7,875.00');
  assert.match(read('src/components/Landing.astro'), /page\.modified/);
  assert.match(read('src/components/Landing.astro'), /dateLine=\{dateLine\}/);
  assert.match(read('src/layouts/Base.astro'), /article:modified_time/);
});
