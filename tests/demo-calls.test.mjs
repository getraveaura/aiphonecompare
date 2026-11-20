import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { demoCallFor, demoCallsForSlugs, pageModified } from '../src/lib/demo-calls.mjs';

const data = JSON.parse(fs.readFileSync('src/data/demo-calls.json', 'utf8'));
const vendors = JSON.parse(fs.readFileSync('src/data/vendors.json', 'utf8'));
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SLUGS = ['upfirst', 'my-ai-front-desk', 'oncrew', 'dialzara', 'lexidesk'];

test('the five demo-line calls exist and match listed vendors', () => {
  assert.deepEqual(data.calls.map((c) => c.slug), SLUGS);
  for (const call of data.calls) {
    const v = vendors.find((x) => x.slug === call.slug);
    assert.ok(v, call.slug);
    assert.equal(call.name, v.name);
    assert.equal(call.date, '2026-11-19');
    assert.equal(call.sourceType, 'demo_line');
    assert.match(call.window, /Pacific Time/);
    assert.ok(['vendor_desk', 'sample_business'].includes(call.demoMode));
    if (call.demoMode === 'sample_business') assert.ok(call.sampleBusiness);
  }
});

test('each call covers the four checks and one quirk, with no score', () => {
  for (const call of data.calls) {
    assert.deepEqual(call.checks.map((c) => c.id), ['booking', 'urgent', 'pricing', 'human'], call.slug);
    for (const c of call.checks) assert.ok(c.text.length > 30, `${call.slug} ${c.id}`);
    assert.equal(call.quirk.label, 'Worth knowing');
    assert.ok(call.quirk.text.length > 20);
    const blob = JSON.stringify(call);
    assert.doesNotMatch(blob, /score|\/\s*75|out of \d+|rating/i, call.slug);
    assert.doesNotMatch(blob, /\$\d/, `${call.slug} should not add prices`);
  }
});

test('method notes the demo-line caveat and what was not tested', () => {
  assert.match(data.method.note, /demo line/i);
  assert.match(data.method.note, /may behave differently/);
  assert.match(data.method.placedBy, /AI assistant/);
  assert.match(data.method.placedBy, /recorded line/);
  assert.ok(data.method.notTested.some((x) => /wrong number/.test(x) && /spam/.test(x)));
});

test('lookups and page freshness', () => {
  assert.equal(demoCallFor('oncrew').sampleBusiness, 'Summit Plumbing and Heating');
  assert.equal(demoCallFor('smith-ai'), null);
  assert.deepEqual(demoCallsForSlugs(['dialzara', 'smith-ai']).map((c) => c.slug), ['dialzara']);
  assert.equal(pageModified('2026-11-14', '2026-11-19'), '2026-11-19');
  assert.equal(pageModified('2026-11-21', undefined), '2026-11-21');
});

test('vendor pages, about and guides wire in the section', () => {
  const vendor = read('src/pages/vendors/[slug].astro');
  assert.match(vendor, /<DemoCall slug=\{v\.slug\}/);
  const comp = read('src/components/DemoCall.astro');
  assert.match(comp, /id="we-called-them"/);
  assert.match(comp, /Public demo line/);
  assert.match(comp, /may differ from a live account/);
  assert.match(comp, /did not test wrong-number or spam/);
  assert.match(read('src/pages/about.astro'), /id="demo-line-tests"/);
  assert.match(read('src/components/BestGuide.astro'), /demoCallsForSlugs/);
});
