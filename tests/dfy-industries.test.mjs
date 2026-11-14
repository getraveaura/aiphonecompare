import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DFY_CASE_STUDY_NOTE,
  DFY_INCLUDED,
  DFY_INDUSTRIES,
  DFY_INDUSTRY_SLUGS,
  DFY_QUESTIONS_LINE,
  dfyForIndustryPage,
  dfyIndustry,
  dfyIndustryPath,
} from '../src/lib/dfy-industries.mjs';
import { ACCENTS } from '../src/lib/industries.mjs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('src/pages/done-for-you/[industry].astro');

test('four industry versions at the expected paths', () => {
  assert.deepEqual(DFY_INDUSTRY_SLUGS, ['dental', 'legal', 'home-services', 'med-spa']);
  assert.equal(dfyIndustryPath('dental'), '/done-for-you/dental/');
  assert.equal(dfyIndustryPath('med-spa'), '/done-for-you/med-spa/');
  assert.equal(dfyIndustry('legal').name, 'Legal');
  assert.equal(dfyIndustry('nope'), null);
});

test('each industry has a headline, tuned benefits, 2-3 example flows and an FAQ', () => {
  for (const item of DFY_INDUSTRIES) {
    for (const key of ['name', 'audience', 'title', 'headline', 'lead', 'description', 'cardLine', 'icon']) {
      assert.ok(item[key], `${item.slug}.${key}`);
    }
    assert.ok(item.benefits.length >= 4, item.slug);
    for (const b of item.benefits) assert.ok(b.h && b.p, item.slug);
    assert.ok(item.flows.length >= 2 && item.flows.length <= 3, item.slug);
    for (const flow of item.flows) {
      assert.ok(flow.title, item.slug);
      assert.ok(flow.steps.length >= 2, `${item.slug}: ${flow.title}`);
    }
    assert.ok(item.faqs.length >= 3, item.slug);
    for (const f of item.faqs) assert.ok(f.q.endsWith('?') && f.a, item.slug);
    assert.ok(ACCENTS[item.accent], `${item.slug} accent`);
    // Same approved prices everywhere: copy must not carry a different amount.
    const prices = JSON.stringify(item).match(/\$[\d,]+/g) || [];
    for (const p of prices) assert.ok(['$1,500', '$1,000'].includes(p), `${item.slug} mentions ${p}`);
  }
});

test('industry-tuned benefits cover the requested topics', () => {
  const heads = (slug) => dfyIndustry(slug).benefits.map((b) => b.h).join(' | ').toLowerCase();
  for (const word of ['new-patient', 'insurance', 'recall', 'hipaa']) assert.match(heads('dental'), new RegExp(word));
  for (const word of ['intake', 'conflict-safe', 'multilingual', 'urgent']) assert.match(heads('legal'), new RegExp(word));
  for (const word of ['emergency', 'dispatch', 'quote', 'service-area']) assert.match(heads('home-services'), new RegExp(word));
  for (const word of ['consult', 'no medical advice', 'deposits', 'after-hours']) assert.match(heads('med-spa'), new RegExp(word));
});

test('industry pages map to the matching done-for-you version', () => {
  assert.equal(dfyForIndustryPage('dental').slug, 'dental');
  assert.equal(dfyForIndustryPage('legal').slug, 'legal');
  assert.equal(dfyForIndustryPage('plumbing').slug, 'home-services');
  assert.equal(dfyForIndustryPage('medical'), null);
  assert.equal(dfyIndustry('med-spa').industryPage, null);
  const industry = read('src/components/Industry.astro');
  assert.match(industry, /dfyForIndustryPage\(key\)/);
  assert.match(industry, /href=\{dfyIndustryPath\(dfy\.slug\)\}/);
});

test('industry page uses the approved offer, guarantee and contact line, with no calendar button', () => {
  assert.match(page, /from '\.\.\/\.\.\/lib\/offers\.mjs'/);
  assert.match(page, /href=\{founding\.url\}/);
  assert.match(page, /href=\{standard\.url\}/);
  assert.match(page, /dfyServiceJsonld\(/);
  assert.match(page, /'@type': 'FAQPage'/);
  assert.match(page, /<Faq items=\{item\.faqs\}\/>/);
  assert.match(page, /<DfyGuarantee \/>/);
  assert.match(page, /<DfyMeasure \/>/);
  assert.match(page, /\{DFY_CASE_STUDY_NOTE\}/);
  assert.match(page, /Questions\? Email <a href=\{mailto\}>\{email\}<\/a> — \{DFY_QUESTIONS_LINE\}/);
  assert.match(page, /Example call flows/);
  assert.match(page, /dfy-flow-tag">Example</);
  assert.doesNotMatch(page, /calendly|cal\.com|book a call|schedule a call/i);
  assert.doesNotMatch(page, /noindex/);
  assert.equal(DFY_QUESTIONS_LINE, 'replies within the hour during business hours (Pacific).');
  assert.equal(DFY_CASE_STUDY_NOTE, "Founding clients can opt in to a short case study about their results. It's optional and never affects your price.");
  assert.equal(DFY_INCLUDED.length, 5);
});

test('/done-for-you/ shares the guarantee, carries the case-study note and links every industry', () => {
  const main = read('src/pages/done-for-you.astro');
  assert.match(main, /<DfyGuarantee \/>/);
  assert.match(main, /<DfyIndustryCards \/>/);
  assert.match(main, /<p class="dfy-casestudy">\{DFY_CASE_STUDY_NOTE\}<\/p>/);
  const guarantee = read('src/components/DfyGuarantee.astro');
  assert.match(guarantee, /full refund of our \$1,500 fee \(or \$1,000 at the founding rate\)/);
  const cards = read('src/components/DfyIndustryCards.astro');
  assert.match(cards, /DFY_INDUSTRIES\.filter/);
  assert.match(cards, /href=\{dfyIndustryPath\(item\.slug\)\}/);
});

test('postbuild lists the industry versions in llms files', () => {
  const post = read('postbuild.mjs');
  assert.match(post, /DFY_INDUSTRIES\.map\(i=>\(\{title:i\.title,path:dfyIndustryPath\(i\.slug\)/);
});
