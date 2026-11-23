import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AUDIT_PATH, showAuditLinks } from '../src/lib/audit.mjs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('src/pages/cost/ai-vs-live-receptionist.astro');

test('AI vs live cost page keeps its sourced figures, blanks and labels', () => {
  for (const figure of ['$199', '$270', '$295', '$1,347.75', '$1,440', '$1,635']) assert.ok(page.includes(`at150: '${figure}'`), figure);
  for (const figure of ['$72.20', '$75', '$109', '$349', '$500', '$632.50', '$492', '$530', '$620', '$2,100', '$2,484', '$3,127.50']) assert.ok(page.includes(`'${figure}'`), figure);
  assert.match(page, /readyRange\(models, 150\)/);
  assert.doesNotMatch(page, /\$199–\$295/);
  assert.match(page, /const CHECKED = models\.checked/);
  assert.match(page, /modified=\{CHECKED\}/);
  assert.match(page, /\$1,347\.75–\$1,635/);
  assert.match(page, /Setup fee: Not published/);
  assert.match(page, /It is our calculation, not a printed list price/);
  assert.match(page, /May cost more: minutes round up and include hold and after-call time/);
  assert.match(page, /Ruby may cost more than shown/);
  assert.equal(AUDIT_PATH, '/audit/');
  assert.equal(showAuditLinks(), true);
  assert.ok((page.match(/href=\{AUDIT_PATH\}/g) || []).length >= 3, 'audit CTAs');
  assert.doesNotMatch(page, /OnCrew|My AI Front Desk|Goodcall/);
});

test('AI vs live cost page keeps every source link, title, meta and FAQ data', () => {
  for (const href of [
    'https://dialzara.com/pricing', 'https://smith.ai/pricing/ai-receptionist', 'https://agentzap.ai/pricing',
    'https://www.ruby.com/plans-and-pricing/', 'https://rubyhelpcenter.helpjuice.com/billing-plans/am-i-on-the-right-billing-plan', 'https://www.ruby.com/faqs/',
    'https://smith.ai/pricing/receptionists', 'https://www.abby.com/pricing/', 'https://www.abby.com/comparisons/abby-vs-answerconnect/', 'https://www.abby.com/blog/cost-comparison-receptionist-service/',
  ]) assert.ok(page.includes(href), href);
  assert.match(page, /How much does a virtual receptionist cost\? Live vs AI, with sourced prices \(2026\)/);
  assert.match(page, /What a live virtual receptionist and an AI receptionist cost per month at 50, 150 and 300 calls/);
  assert.match(page, /'@type': 'FAQPage'/);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.equal((page.match(/\{ q: '/g) || []).length, 5);
});

test('/cost/, the calculator and the homepage link to the AI vs live cost page', () => {
  for (const p of ['src/pages/cost.astro', 'src/pages/cost/calculator.astro', 'src/pages/index.astro']) {
    assert.match(read(p), /href="\/cost\/ai-vs-live-receptionist\/"/, p);
  }
  assert.match(read('postbuild.mjs'), /cost\/ai-vs-live-receptionist\//);
});

test('AI vs live cost page tracks calculator and audit CTA clicks', () => {
  assert.match(page, /data-offer-cta="calculator"/);
  assert.match(page, /data-offer-cta="audit"/);
  assert.match(page, /data-offer-cta-source="ai-vs-live"/);
  assert.ok((page.match(/data-offer-cta="calculator"/g) || []).length >= 3);
  assert.ok((page.match(/data-offer-cta="audit"/g) || []).length >= 3);
});
