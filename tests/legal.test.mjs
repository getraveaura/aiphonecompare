import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  LEAD_ENDPOINT,
  STORY_INDUSTRIES,
  buildStoriesPayload,
  storiesSignupMessage,
} from '../src/lib/leads.mjs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pages = {
  privacy: 'src/pages/privacy.astro',
  terms: 'src/pages/terms.astro',
  refunds: 'src/pages/refunds.astro',
};

test('privacy, terms and refunds pages exist with a date and contact', () => {
  for (const path of Object.values(pages)) {
    assert.ok(fs.existsSync(new URL(`../${path}`, import.meta.url)), `${path} exists`);
    const source = read(path);
    assert.match(source, /Last updated: November 13, 2026/);
    assert.match(source, /timothy@aiphonecompare\.com/);
    assert.match(source, /description=/);
  }
});

test('the footer links privacy, terms and refunds', () => {
  const base = read('src/layouts/Base.astro');
  const footer = base.slice(base.indexOf('<footer'), base.indexOf('</footer>'));
  for (const href of ['/privacy/', '/terms/', '/refunds/']) {
    assert.ok(footer.includes(`href="${href}"`), `footer links ${href}`);
  }
});

test('get featured links the refund policy', () => {
  assert.match(read('src/pages/get-featured.astro'), /href="\/refunds\/"/);
});

test('refunds page links the done-for-you page', () => {
  assert.ok(read(pages.refunds).includes('href="/done-for-you/"'));
});

test('privacy page names every data processor', () => {
  const privacy = read(pages.privacy);
  for (const name of ['PostHog', 'Supabase', 'Resend', 'Stripe']) {
    assert.ok(privacy.includes(name), `mentions ${name}`);
  }
  assert.ok(!privacy.includes('It is not a legal policy'));
});

test('stories payload is shaped for the shared lead endpoint', () => {
  assert.deepEqual(
    buildStoriesPayload({ email: '  Owner@Example.com ', industry: 'hvac', honeypot: null }),
    { email: 'owner@example.com', industry: 'hvac', source: 'stories', company_website: '' },
  );
  assert.equal(buildStoriesPayload({ email: 'a@b.co', industry: 'bogus' }).industry, 'other');
  assert.equal(buildStoriesPayload({ email: 'a@b.co', industry: 'dental', honeypot: 'spam.example' }).company_website, 'spam.example');
  assert.equal(buildStoriesPayload({ email: 'x'.repeat(400) + '@b.co', industry: 'legal' }).email.length, 320);
  assert.deepEqual(STORY_INDUSTRIES, ['dental', 'medical', 'legal', 'plumbing', 'hvac', 'roofing', 'other']);
});

test('stories signup messages cover success, rate limit and errors', () => {
  assert.match(storiesSignupMessage(200, true), /on the list.*timothy@aiphonecompare\.com/);
  assert.match(storiesSignupMessage(429, false), /Too many tries/);
  assert.match(storiesSignupMessage(400, false), /did not save/);
  assert.match(storiesSignupMessage(0, false), /did not save/);
});

test('the stories form posts to the shared lead endpoint', () => {
  const signup = read('src/components/Signup.astro');
  assert.ok(signup.includes('LEAD_ENDPOINT'));
  assert.ok(signup.includes('name="company_website"'));
  assert.ok(signup.includes("track('lead_submit'"));
  assert.ok(!signup.includes('signup.json'));
  assert.match(LEAD_ENDPOINT, /\/functions\/v1\/apc-lead$/);
});
