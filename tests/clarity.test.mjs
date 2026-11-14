import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('homepage says what the site is, shows 3 steps and explains how we make money', () => {
  const home = read('src/pages/index.astro');
  assert.match(home, /A free, independent site that compares/);
  assert.equal((home.match(/<li><span>\d<\/span>/g) || []).length, 3);
  assert.match(home, /id="how-this-works"/);
  for (const s of ['Free for businesses.', 'We may earn a referral fee.', 'Rankings are not for sale.']) assert.ok(home.includes(s), s);
});

test('vendor pages open with who they are for and a plain example', () => {
  for (const p of ['src/pages/competitor-check-up.astro', 'src/pages/get-featured.astro']) {
    const page = read(p);
    assert.match(page, /For companies that sell AI phone answering/);
    assert.match(page, /class="plain-example"/);
  }
});

test('offer pages avoid jargon in visible copy', () => {
  const src = read('src/pages/competitor-check-up.astro');
  const teardown = src.slice(src.indexOf('<Base'), src.indexOf('<script>'));
  for (const word of [/\bteardown\b(?![_'"\/])/i, /AI answers/, /\bcites\b/, /\boverage\b/i, /\btier\b/i, /entry plan/i, /Usually in 2 to 6/]) {
    const visible = teardown.replace(/TEARDOWN\.\w+|\/og\/teardown\.png|\/teardown\/|data-offer-checkout="teardown"|#teardown|teardown_paid_return/g, '');
    assert.doesNotMatch(visible, word, String(word));
  }
});

test('shared page templates open with a plain intro and one primary button', () => {
  for (const p of ['src/components/Landing.astro', 'src/components/BestGuide.astro', 'src/components/Industry.astro', 'src/pages/vendors/[slug].astro', 'src/pages/vendors/index.astro', 'src/pages/best/index.astro', 'src/pages/pricing.astro', 'src/pages/cost.astro']) {
    assert.match(read(p), /<PlainIntro\b/, p);
  }
  assert.match(read('src/components/PlainIntro.astro'), /class="btn btn-primary"/);
});

test('cost pages and tools avoid unexplained jargon', () => {
  for (const p of ['src/pages/cost.astro', 'src/pages/cost/calculator.astro', 'src/lib/calculator.mjs', 'src/pages/match/index.astro', 'src/pages/overpaying/index.astro']) {
    const src = read(p);
    for (const word of [/Per-call plans/, /minute-billed/i, /monthly scenario/i, /Scenario this month/, /published allowance/i, /\bSigned BAA\b/]) {
      assert.doesNotMatch(src, word, `${p}: ${word}`);
    }
  }
});
