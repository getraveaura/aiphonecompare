import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  CHECKOUT_OFFERS,
  EVENTS,
  checkoutProperties,
  contactProperties,
  eventFromClick,
  offerFromStripeUrl,
  sanitizeProperties,
  vendorProperties,
} from '../src/lib/analytics.mjs';
import { DFY_OFFERS, SPOTLIGHT, TEARDOWN } from '../src/lib/offers.mjs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function el(attrs = {}) {
  const node = {
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    closest(sel) {
      const href = attrs.href || '';
      const selectors = sel.split(',').map((part) => part.trim());
      for (const part of selectors) {
        if (part === '[data-offer-checkout]' && attrs['data-offer-checkout']) return node;
        if (part === 'a[href*="buy.stripe.com"]' && href.includes('buy.stripe.com')) return node;
        if (part === '[data-vendor-slug]' && attrs['data-vendor-slug']) return node;
        if (part === 'a[href^="mailto:"]' && href.startsWith('mailto:')) return node;
      }
      return null;
    },
  };
  return node;
}

test('checkout properties cover every live pay-link tier', () => {
  assert.deepEqual(Object.keys(CHECKOUT_OFFERS).sort(), ['dfy_founding', 'dfy_standard', 'spotlight', 'teardown']);
  assert.deepEqual(checkoutProperties('spotlight'), { offer: 'spotlight', price_tier: 'spotlight', price: SPOTLIGHT.price });
  assert.deepEqual(checkoutProperties('teardown'), { offer: 'teardown', price_tier: 'teardown', price: TEARDOWN.price });
  assert.deepEqual(checkoutProperties('dfy_founding'), { offer: 'dfy_founding', price_tier: 'dfy_founding', price: DFY_OFFERS.founding.price });
  assert.deepEqual(checkoutProperties('dfy_standard'), { offer: 'dfy_standard', price_tier: 'dfy_standard', price: DFY_OFFERS.standard.price });
  assert.equal(checkoutProperties('nope'), null);
  assert.equal(offerFromStripeUrl(SPOTLIGHT.url), 'spotlight');
  assert.equal(offerFromStripeUrl(`${TEARDOWN.url}?prefilled=1`), 'teardown');
  assert.equal(offerFromStripeUrl(DFY_OFFERS.founding.url), 'dfy_founding');
  assert.equal(offerFromStripeUrl(DFY_OFFERS.standard.url), 'dfy_standard');
  assert.equal(offerFromStripeUrl('https://example.com'), null);
});

test('contact properties keep the subject and never include the address', () => {
  const withSubject = contactProperties('mailto:timothy@aiphonecompare.com?subject=Competitor%20teardown');
  assert.deepEqual(withSubject, { subject: 'Competitor teardown' });
  assert.ok(!JSON.stringify(withSubject).includes('@'));
  assert.deepEqual(contactProperties('mailto:timothy@aiphonecompare.com'), {});
  assert.equal(contactProperties('mailto:?subject=Share%20this'), null);
  assert.equal(contactProperties('/about/'), null);
});

test('vendor properties record the slug and whether the link is a referral', () => {
  assert.deepEqual(vendorProperties('oncrew', '1'), { vendor: 'oncrew', is_referral: true });
  assert.deepEqual(vendorProperties('smith.ai', false), { vendor: 'smith.ai', is_referral: false });
  assert.equal(vendorProperties('  '), null);
});

test('sanitizeProperties drops emails and name fields', () => {
  assert.deepEqual(
    sanitizeProperties({ industry: 'dental', email: 'owner@example.com', name: 'Ada', source: 'stories_signup' }),
    { industry: 'dental', source: 'stories_signup' },
  );
  assert.deepEqual(sanitizeProperties({ note: 'write owner@example.com' }), {});
});

test('eventFromClick maps pay, vendor and mailto links to the shared event names', () => {
  assert.deepEqual(eventFromClick(el({ 'data-offer-checkout': 'spotlight', href: SPOTLIGHT.url })), {
    event: EVENTS.checkout,
    properties: { offer: 'spotlight', price_tier: 'spotlight', price: SPOTLIGHT.price },
  });
  assert.deepEqual(eventFromClick(el({ href: DFY_OFFERS.founding.url })), {
    event: EVENTS.checkout,
    properties: { offer: 'dfy_founding', price_tier: 'dfy_founding', price: DFY_OFFERS.founding.price },
  });
  assert.deepEqual(eventFromClick(el({ 'data-vendor-slug': 'oncrew', 'data-vendor-referral': '1', href: 'https://oncrew.ai/ref/aiphonecompare' })), {
    event: EVENTS.vendor,
    properties: { vendor: 'oncrew', is_referral: true },
  });
  assert.deepEqual(eventFromClick(el({ href: 'mailto:timothy@aiphonecompare.com?subject=Done-for-you%20AI%20receptionist' })), {
    event: EVENTS.contact,
    properties: { subject: 'Done-for-you AI receptionist' },
  });
  assert.equal(eventFromClick(el({ href: 'mailto:?subject=Share%20this' })), null);
  assert.equal(eventFromClick(el({ href: '/vendors/oncrew/' })), null);
});

test('offer pages mark every Stripe pay link with data-offer-checkout', () => {
  const featured = read('src/pages/get-featured.astro');
  const dfy = read('src/pages/done-for-you.astro');
  const teardown = read('src/pages/teardown.astro');
  assert.match(featured, /data-offer-checkout="spotlight"/);
  assert.equal([...dfy.matchAll(/data-offer-checkout="dfy_founding"/g)].length, 3);
  assert.equal([...dfy.matchAll(/data-offer-checkout="dfy_standard"/g)].length, 2);
  assert.match(teardown, /data-offer-checkout="teardown"/);
  assert.doesNotMatch(featured + dfy + teardown, /data-spotlight-checkout|data-dfy-checkout|data-teardown-checkout/);
  assert.doesNotMatch(featured + dfy + teardown, /spotlight_checkout_clicked|dfy_checkout_clicked|teardown_checkout_clicked/);
});

test('click tracking is bound once in PostHog and vendor links carry slug attributes', () => {
  const posthog = read('src/components/PostHog.astro');
  assert.match(posthog, /bindClickTracking\(\)/);
  assert.match(posthog, /persistence: 'memory'/);
  assert.match(posthog, /autocapture: false/);
  const vendor = read('src/pages/vendors/[slug].astro');
  assert.match(vendor, /data-vendor-slug=\{v\.slug\}/);
  assert.match(vendor, /data-vendor-referral=\{outbound\.isReferral/);
  const table = read('src/components/VendorTable.astro');
  assert.match(table, /data-vendor-slug=\{v\.slug\}/);
});

test('forms and tools fire the shared event names without passing an email', () => {
  const signup = read('src/components/Signup.astro');
  assert.match(signup, /track\('lead_submit', \{ source: 'stories_signup', industry: payload\.industry \}\)/);
  assert.doesNotMatch(signup, /payload\.email|data\.get\('email'\) \}/);
  const overpaying = read('src/pages/overpaying/index.astro');
  assert.match(overpaying, /track\('tool_used', \{[\s\S]*tool: 'overpaying'/);
  assert.match(overpaying, /track\('lead_submit', \{ source: 'overpaying'/);
  const match = read('src/pages/match/index.astro');
  assert.match(match, /track\('tool_used', \{[\s\S]*tool: 'match'/);
  const calculator = read('src/pages/cost/calculator.astro');
  assert.match(calculator, /track\('tool_used', \{[\s\S]*tool: 'cost_calculator'/);
  const cost = read('src/pages/cost.astro');
  assert.match(cost, /track\('tool_used', \{ tool: 'cost_method'/);
  const missed = read('src/pages/missed-call-calculator.astro');
  assert.match(missed, /apcTrack\('tool_used', \{ tool: 'missed_call' \}\)/);
});
