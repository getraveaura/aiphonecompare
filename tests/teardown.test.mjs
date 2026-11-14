import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TEARDOWN } from '../src/lib/offers.mjs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('teardown offer is the approved $199 with a 14-day refund and a live Stripe link', () => {
  assert.equal(TEARDOWN.price, 199);
  assert.equal(TEARDOWN.refundDays, 14);
  assert.match(TEARDOWN.url, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/);
});

test('check-up page uses the Payment Link, not a mailto, as its main CTA', () => {
  const page = read('src/pages/competitor-check-up.astro');
  assert.match(page, /href=\{TEARDOWN\.url\}/);
  assert.ok(!/td-cta"[^>]*mailto:/.test(page));
  assert.match(page, /href="\/refunds\/#competitor-check-up"/);
});

test('check-up lives at /competitor-check-up/ and /teardown/ redirects there with a canonical', () => {
  assert.equal(TEARDOWN.path, '/competitor-check-up/');
  const old = read('src/pages/teardown.astro');
  assert.match(old, /http-equiv="refresh"/);
  assert.match(old, /rel="canonical" href=\{target\}/);
  assert.match(old, /name="robots" content="noindex"/);
  assert.match(old, /location\.search/, 'keeps ?paid=1 from the Stripe return');
});

test('refunds page has a check-up section with the 14-day full refund, old anchor kept', () => {
  const refunds = read('src/pages/refunds.astro');
  assert.match(refunds, /id="competitor-check-up"/);
  assert.match(refunds, /id="teardown"/);
  assert.match(refunds, /within 14 days/);
  assert.ok(refunds.includes('href="/competitor-check-up/"'));
});

test('no internal link points at the old /teardown/ URL', () => {
  for (const p of ['src/layouts/Base.astro', 'src/pages/about.astro', 'src/pages/refunds.astro', 'src/pages/competitor-check-up.astro', 'src/components/OtherOffers.astro', 'supabase/functions/apc-stripe-webhook/index.ts']) {
    assert.doesNotMatch(read(p), /href="\/teardown\/|aiphonecompare\.com\/teardown\//, p);
  }
});

test('stripe webhook logs teardown payments and keeps the other offers', () => {
  const hook = read('supabase/functions/apc-stripe-webhook/index.ts');
  const plink = TEARDOWN.url && 'plink_1UbSr1DIQTTGLh9lGvqLAYW5';
  assert.ok(hook.includes(plink));
  assert.match(hook, /competitor-teardown/);
  assert.match(hook, /teardownEmail/);
  assert.match(hook, /company_website/);
  for (const other of ['plink_1UYUSEDIQTTGLh9lp7mhODhB', 'plink_1UbSgxDIQTTGLh9lxuqafUsQ', 'plink_1UbSh6DIQTTGLh9lNnNdDoCZ', 'dfyEmail', 'spotlightEmail']) {
    assert.ok(hook.includes(other), `keeps ${other}`);
  }
});
