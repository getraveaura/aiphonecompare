import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DFY_EMAIL,
  DFY_OFFERS,
  DFY_PATH,
  DFY_SUMMARY,
  FOUNDING_SPOTS,
  dfyServiceJsonld,
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
  assert.match(page, /isPaidReturn\(window\.location\.search\)/);
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
