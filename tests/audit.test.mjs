import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AUDIT_CHECKS,
  AUDIT_FIELDS,
  AUDIT_INDUSTRIES,
  AUDIT_LIVE,
  AUDIT_PATH,
  AUDIT_SUCCESS,
  auditErrorMessage,
  auditRobots,
  buildAuditPayload,
  normalizeWebsite,
  showAuditLinks,
  validateAuditForm,
} from '../src/lib/audit.mjs';
import { HIDDEN_ROBOTS, linksVisible, robotsFor } from '../src/lib/launch.mjs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const good = {
  name: 'Sam',
  business: 'Bright Smiles Dental',
  site_url: 'brightsmiles.com',
  industry: 'dental',
  email: 'Sam@BrightSmiles.com',
};

test('audit is live, indexable and linked at /audit/', () => {
  assert.equal(AUDIT_LIVE, true);
  assert.equal(AUDIT_PATH, '/audit/');
});

test('launch gating: noindex,nofollow and no links until live', () => {
  assert.equal(HIDDEN_ROBOTS, 'noindex,nofollow');
  assert.equal(robotsFor(false), 'noindex,nofollow');
  assert.equal(robotsFor(undefined), 'noindex,nofollow');
  assert.equal(robotsFor(true), undefined);
  assert.equal(linksVisible(false), false);
  assert.equal(linksVisible(true), true);
  // Live state (current) and hidden state.
  assert.equal(auditRobots(), undefined);
  assert.equal(showAuditLinks(), true);
  assert.equal(auditRobots(false), 'noindex,nofollow');
  assert.equal(showAuditLinks(false), false);
});

test('the report covers the eight public-info checks', () => {
  assert.deepEqual(AUDIT_CHECKS.map((c) => c.key), ['click-to-call', 'hours', 'after-hours', 'booking', 'chat-text', 'contact-form', 'gbp', 'reviews']);
  for (const c of AUDIT_CHECKS) assert.ok(c.label && c.detail, c.key);
});

test('industries match the edge function keys', () => {
  assert.deepEqual(AUDIT_INDUSTRIES.map(([k]) => k), ['dental', 'legal', 'home-services', 'med-spa', 'medical', 'hvac', 'roofing', 'plumbing', 'other']);
  const fn = read('supabase/functions/apc-lead/index.ts');
  for (const [key] of AUDIT_INDUSTRIES) assert.match(fn, new RegExp(`\\["${key}", "`), `INDUSTRIES has ${key}`);
});

test('website: http(s) only, scheme added, max 200 characters', () => {
  assert.equal(normalizeWebsite('brightsmiles.com'), 'https://brightsmiles.com/');
  assert.equal(normalizeWebsite('  http://www.example.co.uk/about  '), 'http://www.example.co.uk/about');
  assert.equal(normalizeWebsite('HTTPS://Example.com'), 'https://example.com/');
  for (const bad of ['', 'not a site', 'ftp://example.com', 'javascript:alert(1)', 'localhost', 'https://user:pw@example.com', 'example', null]) {
    assert.equal(normalizeWebsite(bad), '', String(bad));
  }
  const long = `example.com/${'a'.repeat(200)}`;
  assert.equal(normalizeWebsite(long), '');
  assert.ok(normalizeWebsite(`example.com/${'a'.repeat(150)}`).length <= 200);
});

test('validateAuditForm accepts a complete form and normalizes it', () => {
  const result = validateAuditForm(good);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.values.site_url, 'https://brightsmiles.com/');
  assert.equal(result.values.email, 'sam@brightsmiles.com');
  assert.equal('phone' in result.values, false);
});

test('validateAuditForm flags each missing or bad field with friendly copy', () => {
  const empty = validateAuditForm({});
  assert.equal(empty.ok, false);
  assert.deepEqual(Object.keys(empty.errors).sort(), [...AUDIT_FIELDS].sort());
  const bad = validateAuditForm({ ...good, site_url: 'ftp://x', industry: 'spaceships', email: 'nope' });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['email', 'industry', 'site_url']);
  for (const message of Object.values(bad.errors)) {
    assert.doesNotMatch(message, /invalid|error|wrong/i);
  }
  assert.ok(validateAuditForm({ ...good, name: '  <>  ' }).errors.name);
  assert.equal(validateAuditForm({ ...good, name: 'Sam <b>' }).values.name, 'Sam b');
});

test('payload uses site_url for the website, keeps the honeypot separate, and has no phone', () => {
  const { values } = validateAuditForm(good);
  const payload = buildAuditPayload(values, '');
  assert.deepEqual(Object.keys(payload).sort(), ['business', 'company_website', 'email', 'industry', 'name', 'site_url', 'source']);
  assert.equal(payload.source, 'audit');
  assert.equal(payload.site_url, 'https://brightsmiles.com/');
  assert.equal(payload.company_website, '');
  assert.equal(buildAuditPayload(values, null).company_website, '');
  assert.equal(buildAuditPayload(values, 'http://spam').company_website, 'http://spam');
});

test('error and success copy', () => {
  assert.match(auditErrorMessage(429), /try again/i);
  assert.match(auditErrorMessage(400, 'rate_limited'), /try again/i);
  assert.match(auditErrorMessage(0), /timothy@aiphonecompare\.com/);
  assert.match(auditErrorMessage(400, 'site_url'), /website/);
  assert.match(auditErrorMessage(500), /try again/i);
  assert.equal(AUDIT_SUCCESS.heading, "You're in.");
  assert.match(AUDIT_SUCCESS.body, /^Look for a confirmation email from Timothy/);
  assert.match(AUDIT_SUCCESS.body, /never place a test call/);
});

test('audit page: gated robots, honeypot, consent line, no phone or test-call promise', () => {
  const page = read('src/pages/audit.astro');
  assert.match(page, /robots=\{auditRobots\(\)\}/);
  assert.match(page, /name="site_url"/);
  assert.doesNotMatch(page, /name="phone"/);
  assert.match(page, /id="audit-company-website" name="company_website"[^>]*tabindex="-1"/);
  assert.equal((page.match(/name="company_website"/g) || []).length, 1);
  assert.match(page, /By submitting, you agree we may review your public website, Google Business Profile and public reviews, and email you the report\./);
  assert.doesNotMatch(page, /place one short|the number you give us|the one we will test|Book your free audit|we will test/i);
  assert.match(page, /We never place a test call/);
  assert.match(page, /No test call/);
  assert.match(page, /fetch\(LEAD_ENDPOINT/);
  assert.match(page, /buildAuditPayload\(/);
  assert.match(page, /auditErrorMessage\(/);
});

test('Base renders a robots meta from the robots prop', () => {
  const base = read('src/layouts/Base.astro');
  assert.match(base, /\{robotsContent && <meta name="robots" content=\{robotsContent\}\/>\}/);
  // postbuild's noindex check matches the hidden value, so a gated page stays out of the sitemap and IndexNow.
  assert.match(`<meta name="robots" content="${HIDDEN_ROBOTS}">`, /<meta name="robots" content="[^"]*noindex/);
});

test('links to /audit/ only render through the gate', () => {
  const files = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
      const p = `${dir}/${f.name}`;
      if (f.isDirectory()) walk(p);
      else if (/\.(astro|mjs)$/.test(f.name)) files.push(p);
    }
  };
  walk('src');
  for (const p of files) {
    if (p === 'src/lib/audit.mjs') continue;
    assert.doesNotMatch(read(p), /["'`]\/audit\/["'`]/, `${p} must use AUDIT_PATH behind showAuditLinks()`);
  }
  const cta = read('src/components/AuditCta.astro');
  assert.match(cta, /\{showAuditLinks\(\) && \(/);
  const base = read('src/layouts/Base.astro');
  assert.match(base, /\{showAuditLinks\(\) && <a href=\{AUDIT_PATH\}>/);
  const home = read('src/pages/index.astro');
  assert.match(home, /\{showAuditLinks\(\) && \(/);
  for (const p of ['src/pages/index.astro', 'src/pages/done-for-you.astro', 'src/pages/done-for-you/[industry].astro', 'src/components/Industry.astro']) {
    assert.match(read(p), /<AuditCta\b/, `${p} has the audit CTA`);
  }
});

test('postbuild lists the audit in llms files only when live, and guards the sitemap', () => {
  const post = read('postbuild.mjs');
  assert.match(post, /\.\.\.\(showAuditLinks\(\)\?\[\{title:'Free call coverage check',path:AUDIT_PATH/);
  assert.match(post, /\[showAuditLinks\(\),AUDIT_PATH\]/);
  assert.match(post, /is not live but is indexable/);
});

test('edge function: audit branch, validation and emails; other sources untouched', () => {
  const fn = read('supabase/functions/apc-lead/index.ts');
  assert.match(fn, /if \(cleanText\(body\.source, 40\) === "audit"\) return handleAudit\(body, req, headers\);/);
  assert.match(fn, /audit: \{ site_url: siteUrl, requested_at: requestedAt \}/);
  assert.match(fn, /subject: "Your free call coverage check is confirmed"/);
  assert.match(fn, /subject: `New call coverage check: \$\{business\} \(\$\{industryLabel\}\)`/);
  assert.doesNotMatch(fn, /error: "phone"/);
  assert.doesNotMatch(fn, /audit-phone:/);
  assert.doesNotMatch(fn, /place one short, polite test call/);
  assert.match(fn, /we never place a test call/i);
  assert.match(fn, /error: "site_url"/);
  assert.match(fn, /error: "business"/);
  assert.match(fn, /u\.href\.length <= 200/);
  // The original overpaying/stories path is still there as before.
  assert.match(fn, /const source = cleanText\(body\.source, 40\) \|\| "overpaying";/);
  assert.match(fn, /subject: isStories \? `You're on the \$\{industryLabel\} stories list` : "Your AI receptionist price check results"/);
});
