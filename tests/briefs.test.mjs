import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { cheapestAt, costLlmsBlurb, bestLlmsBlurb, costDescription } from '../src/lib/quotable.mjs';
import { quoteDirectory } from '../src/lib/calculator.mjs';
import { BEST_SHORTLIST_SLUGS, bestFaqs, bestRowCheckedSpan } from '../src/lib/best-faqs.mjs';
import models from '../src/data/cost-models.json' with { type: 'json' };
import vendors from '../src/data/vendors.json' with { type: 'json' };

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the ready-made AI range does not include Ruby or a platform', () => {
  const rows = cheapestAt();
  assert.ok(rows.length >= 10);
  assert.ok(!rows.some((row) => row.slug === 'ruby'));
  assert.ok(!rows.some((row) => row.slug === 'bland-ai' || row.slug === 'elevenlabs-ai-receptionist'));
  assert.ok(!rows.some((row) => row.slug === 'jobber-ai-receptionist'));
  assert.equal(rows[0].cents, 9900);
  assert.equal(rows.at(-1).cents, 52300);
});

test('worked totals are labeled and Ruby is marked as a live plan', () => {
  const quote = quoteDirectory(vendors, models, { industry: 'all', calls: 150, minutes: 3, afterHours: null });
  assert.match(quote.assumptions.join(' '), /our calculation from the printed plan price/);
  const ruby = quote.priced.find((row) => row.slug === 'ruby');
  assert.equal(ruby.kindLabel, 'Live receptionist');
  const bland = quote.priced.find((row) => row.slug === 'bland-ai');
  assert.equal(bland.kindLabel, 'Platform you build');
  const jobber = quote.priced.find((row) => row.slug === 'jobber-ai-receptionist');
  assert.match(jobber.kindLabel, /Add-on/);
  for (const page of ['src/pages/cost.astro', 'src/pages/cost/calculator.astro', 'src/pages/cost/ai-vs-live-receptionist.astro', 'src/lib/landings.mjs']) {
    assert.match(read(page), /our calculation/, page);
  }
});

test('llms copy drops the old AI range and names the new pages', () => {
  const cost = costLlmsBlurb();
  const best = bestLlmsBlurb();
  assert.doesNotMatch(cost, /\$1,635|\$199 to \$1,635/);
  assert.match(cost, /\$99 to \$523/);
  assert.match(cost, /Ruby/);
  assert.match(best, /no paid rank/i);
  assert.doesNotMatch(best, /AggregateRating|#1/);
  const postbuild = read('postbuild.mjs');
  assert.match(postbuild, /costLlmsBlurb\(\)/);
  assert.match(postbuild, /bestLlmsBlurb\(\)/);
  assert.match(postbuild, /\/best\/ai-phone-receptionists\//);
  assert.ok(costDescription().length <= 160);
});

test('the best-of page uses situations, not a numbered score', () => {
  const page = read('src/pages/best/ai-phone-receptionists.astro');
  assert.match(page, /best AI phone receptionists/i);
  assert.doesNotMatch(page, /AggregateRating/);
  assert.doesNotMatch(page, /#1/);
  assert.match(page, /\/cost\//);
  assert.match(page, /\/about\//);
  assert.match(page, /AI Phone Compare research desk/);
  assert.match(read('src/pages/best/index.astro'), /\/best\/ai-phone-receptionists\//);
  for (const item of bestFaqs()) {
    assert.ok(item.words >= 40 && item.words <= 90, `${item.id} ${item.words}`);
    assert.doesNotMatch(item.a, /\$1,635/);
  }
  const small = bestFaqs().find((item) => item.id === 'small-business');
  assert.equal(bestRowCheckedSpan(), '13–20 November 2026');
  assert.match(small.a, /Each row shows the date its price was checked \(13–20 November 2026\)\./);
  assert.doesNotMatch(small.a, /Prices were checked/);
  assert.match(page, /BEST_SHORTLIST_SLUGS/);
  assert.equal(BEST_SHORTLIST_SLUGS.length, 18);
});
