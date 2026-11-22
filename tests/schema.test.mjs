import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firstSentence, latestChecked, priceChangeLead, vendorOffer } from '../src/lib/schema.mjs';
import { costFaqs } from '../src/lib/cost-faq.mjs';
import { formatDate } from '../src/lib/stories.mjs';
import vendors from '../src/data/vendors.json' with { type: 'json' };
import priceLog from '../src/data/price-changes.json' with { type: 'json' };

test('latestChecked picks the newest date and ignores blanks', () => {
  assert.equal(latestChecked([{ last_checked: '2026-11-04' }, { last_checked: '' }, { last_checked: '2026-11-09' }]), '2026-11-09');
  assert.equal(latestChecked([{}]), '');
});

test('vendor offer keeps the price as text and never sets a numeric price', () => {
  for (const v of vendors) {
    const offer = vendorOffer(v);
    if (!/\$\d/.test(v.starting_price || '')) {
      assert.equal(offer, null, `${v.slug} should have no Offer`);
      continue;
    }
    assert.ok(offer, `${v.slug} should have an Offer`);
    assert.equal(offer.price, undefined);
    assert.equal(offer.priceSpecification.price, undefined);
    assert.equal(offer.description, v.starting_price.trim());
    if (v.last_checked) assert.equal(offer.validFrom, v.last_checked);
  }
});

test('vendor without a starting price has no Offer', () => {
  assert.equal(vendorOffer({ name: 'X', starting_price: '' }), null);
  assert.equal(vendorOffer({ name: 'X', starting_price: 'Custom quote' }), null);
});

test('price-change lead uses only the record and stays short', () => {
  for (const change of priceLog.changes) {
    const lead = priceChangeLead(change, formatDate);
    assert.ok(lead.startsWith(firstSentence(change.summary)));
    assert.ok(change.summary.includes(firstSentence(change.summary)));
    assert.ok(lead.includes(formatDate(change.observed)));
    const leadNumbers = lead.match(/\$[\d.,]+/g) || [];
    assert.deepEqual(leadNumbers, [], 'lead should not carry dollar amounts');
    assert.ok(lead.length < 300);
  }
});

test('cost FAQ answers are the visible question copy and leave Ruby out of the AI range', () => {
  const source = fs.readFileSync(new URL('../src/pages/cost.astro', import.meta.url), 'utf8');
  const models = JSON.parse(fs.readFileSync(new URL('../src/data/cost-models.json', import.meta.url), 'utf8'));
  const faqs = costFaqs(models);
  assert.match(source, /\{faqs\[0\]\.a\}/);
  assert.match(source, /\{item\.q\}/);
  assert.match(source, /\{item\.a\}/);
  for (const item of faqs) {
    assert.ok(item.words >= 40 && item.words <= 60, `${item.id} ${item.words}`);
    assert.doesNotMatch(item.a, /\$1,635/);
    if (item.id !== 'vs-live') assert.doesNotMatch(item.a, /Ruby/);
  }
});
