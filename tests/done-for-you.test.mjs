import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CARE_PLANS,
  CARE_PORTAL_URL,
  DFY_EMAIL,
  DFY_OFFERS,
  DFY_PATH,
  DFY_SUMMARY,
  FOUNDING_SPOTS,
  dfyServiceJsonld,
  isCarePaidReturn,
  isPaidReturn,
  usd,
} from '../src/lib/offers.mjs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('src/pages/done-for-you.astro');

test('offer constants match the approved prices and payment links', () => {
  assert.equal(DFY_OFFERS.founding.price, 1000);
  assert.equal(DFY_OFFERS.standard.price, 1500);
  assert.equal(FOUNDING_SPOTS, 5);
  assert.equal(DFY_OFFERS.founding.url, 'https://buy.stripe.com/7sYcN5g6f86pfNu5fQ9ws01');
  assert.equal(DFY_OFFERS.standard.url, 'https://buy.stripe.com/3cIbJ107hgCV58Q0ZA9ws02');
  assert.equal(DFY_EMAIL, 'timothy@aiphonecompare.com');
  assert.equal(usd(1500), '$1,500');
  assert.match(DFY_SUMMARY, /\$1,500 one-time \(\$1,000 founding rate for the first 5 businesses\)/);
});

test('isPaidReturn only matches paid=1', () => {
  assert.equal(isPaidReturn('?paid=1'), true);
  assert.equal(isPaidReturn('?utm_source=x&paid=1'), true);
  assert.equal(isPaidReturn(''), false);
  assert.equal(isPaidReturn(undefined), false);
  assert.equal(isPaidReturn('?paid=0'), false);
  assert.equal(isPaidReturn('?paid=10'), false);
  assert.equal(isPaidReturn('?unpaid=1'), false);
  assert.equal(isPaidReturn('?paid=care'), false);
});

test('care plan constants match the approved prices and payment links', () => {
  assert.equal(CARE_PLANS.care.price, 199);
  assert.equal(CARE_PLANS.plus.price, 299);
  assert.equal(CARE_PLANS.care.url, 'https://buy.stripe.com/fZu14naLV2M5bxefUu9ws04');
  assert.equal(CARE_PLANS.plus.url, 'https://buy.stripe.com/dRm7sLg6f72l0SAgYy9ws05');
  assert.equal(CARE_PLANS.care.paymentLinkId, 'plink_1UbnYBDIQTTGLh9lUfUU9cGw');
  assert.equal(CARE_PLANS.plus.paymentLinkId, 'plink_1UbnYCDIQTTGLh9l8QoG2G4u');
  assert.equal(CARE_PORTAL_URL, 'https://billing.stripe.com/p/login/dRmdR9aLVbiB7gY8s29ws00');
  assert.equal(usd(199), '$199');
});

test('isCarePaidReturn only matches paid=care', () => {
  assert.equal(isCarePaidReturn('?paid=care'), true);
  assert.equal(isCarePaidReturn('?utm_source=x&paid=care'), true);
  assert.equal(isCarePaidReturn(''), false);
  assert.equal(isCarePaidReturn(undefined), false);
  assert.equal(isCarePaidReturn('?paid=1'), false);
  assert.equal(isCarePaidReturn('?paid=careless'), false);
});

test('Service JSON-LD has a founding and a standard Offer', () => {
  const ld = dfyServiceJsonld({ name: 'n', description: 'd', pageUrl: 'https://aiphonecompare.com/done-for-you/', orgId: 'https://aiphonecompare.com/#organization' });
  assert.equal(ld['@type'], 'Service');
  assert.equal(ld.url, 'https://aiphonecompare.com/done-for-you/');
  assert.deepEqual(ld.offers.map((o) => [o['@type'], o.price, o.priceCurrency]), [['Offer', '1000', 'USD'], ['Offer', '1500', 'USD']]);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(ld)));
});

test('done-for-you page is live: indexable, no draft banner, payment links', () => {
  assert.doesNotMatch(page, /<Base[^>]*\bnoindex\b/);
  assert.doesNotMatch(page, /Pricing pending approval|dfy-draft/);
  assert.match(page, /href=\{founding\.url\}/);
  assert.match(page, /href=\{standard\.url\}/);
  assert.match(page, /from '\.\.\/lib\/offers\.mjs'/);
  assert.match(page, /Claim a founding spot — \$\{usd\(founding\.price\)\}/);
  assert.match(page, /Questions first\? Email/);
  assert.doesNotMatch(page, /monthly tuning/i);
  assert.match(page, /You keep everything we set up: the vendor account, the script and the reports\./);
  assert.match(page, /id="dfy-paid"[^>]*hidden/);
  assert.match(page, /Payment received, thank you\./);
  assert.match(page, /id="care-paid"[^>]*hidden/);
  assert.match(page, /isPaidReturn\(window\.location\.search\)/);
  assert.match(page, /isCarePaidReturn\(window\.location\.search\)/);
  assert.match(page, /dfyServiceJsonld\(/);
});

test('postbuild keeps the page in the sitemap, IndexNow and llms files', () => {
  const post = read('postbuild.mjs');
  // Only noindex pages are skipped, and this page is not noindex.
  assert.match(post, /isNoindex\(p\)/);
  assert.match(post, /\[Done-for-you setup\]\(\$\{SITE\}\$\{DFY_PATH\}\): \$\{DFY_SUMMARY\}/);
  assert.match(post, /\$\{SITE\}\$\{DFY_PATH\}: done-for-you setup/);
  assert.equal(DFY_PATH, '/done-for-you/');
});

test('footer links the done-for-you page', () => {
  const base = read('src/layouts/Base.astro');
  const footer = base.slice(base.indexOf('<footer'), base.indexOf('</footer>'));
  assert.ok(footer.includes('<a href="/done-for-you/">Done-for-you</a>'));
});

test('refunds page carries the approved done-for-you terms', () => {
  const refunds = read('src/pages/refunds.astro');
  const section = refunds.slice(refunds.indexOf('id="done-for-you"'), refunds.indexOf('id="contact"'));
  for (const s of ['href="/done-for-you/"', '$1,500', '$1,000', 'first 5', '14 days before go-live', 'days 31–60', '90%', '15%', 'full refund of our fee', 'vendor', '5–10 business days']) {
    assert.ok(section.includes(s), `refunds section includes ${s}`);
  }
  assert.doesNotMatch(section, /once it is offered|when it launches/);
});

test('done-for-you page has a two-tier care plan section', () => {
  const component = read('src/components/DfyCarePlans.astro');
  assert.match(page, /<DfyCarePlans \/>/);
  assert.match(component, /id="care-plans"/);
  assert.match(component, /starts after your 60 days of tuning/i);
  assert.match(component, /cancel anytime/i);
  assert.doesNotMatch(component, /most popular/i);
  assert.doesNotMatch(page, /most popular/i);
  assert.match(component, /The fuller option/);
  assert.match(component, /href=\{care\.url\}/);
  assert.match(component, /href=\{plus\.url\}/);
  assert.match(component, /usd\(care\.price\)/);
  assert.match(component, /usd\(plus\.price\)/);
});

test('industry done-for-you pages include the care plan section', () => {
  const industry = read('src/pages/done-for-you/[industry].astro');
  assert.match(industry, /DfyCarePlans/);
});

test('webhook maps care-plan payment links and sends a welcome email', () => {
  const hook = read('supabase/functions/apc-stripe-webhook/index.ts');
  assert.match(hook, /plink_1UbnYBDIQTTGLh9lUfUU9cGw/);
  assert.match(hook, /plink_1UbnYCDIQTTGLh9l8QoG2G4u/);
  assert.match(hook, /sku: "care-plan"/);
  assert.match(hook, /function careEmail/);
  assert.match(hook, /You're on the care plan/);
  assert.match(hook, /timothy@aiphonecompare\.com/);
  assert.match(hook, /view calls and edit the script/);
  assert.match(hook, /billing.stripe.com\/p\/login/);
  assert.match(hook, /offer\.sku === "care-plan"/);
  assert.match(hook, /subscription: s\.subscription/);
  assert.match(hook, /event\.type !== "checkout\.session\.completed"/);
});
