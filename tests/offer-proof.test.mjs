import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHOW_OFFER_PROOF } from '../src/lib/offers.mjs';

test('offer-page results box stays hidden until a real result exists', () => {
  assert.equal(SHOW_OFFER_PROOF, false);
  for (const page of ['get-featured', 'done-for-you', 'teardown']) {
    const src = readFileSync(`src/pages/${page}.astro`, 'utf8');
    assert.match(src, /\{SHOW_OFFER_PROOF && <(section|OfferProof)/, `${page} gates OfferProof behind the flag`);
  }
});
