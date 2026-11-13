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

test('cost FAQ answers repeat visible /cost/ copy and carry no dollar amounts', () => {
  const source = fs.readFileSync(new URL('../src/pages/cost.astro', import.meta.url), 'utf8');
  const markup = source.slice(source.lastIndexOf('<Base'));
  const visible = markup
    .replace(/<time[^>]*>\{checkedLabel\}<\/time>/g, '6 November 2026')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ');
  for (const item of costFaqs('6 November 2026')) {
    assert.doesNotMatch(item.a, /\$\d/);
    for (const sentence of item.a.split(/(?<=\.)\s+/)) {
      // The FAQ drops "below" so the answer stands alone.
      const probe = sentence.replace('The rows turn', 'The rows below turn');
      assert.ok(visible.includes(probe), `not visible on /cost/: ${sentence}`);
    }
  }
});
