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
  phoneDigits,
  showAuditLinks,
  validPhone,
  validateAuditForm,
} from '../src/lib/audit.mjs';
import { HIDDEN_ROBOTS, linksVisible, robotsFor } from '../src/lib/launch.mjs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const good = {
  name: 'Sam',
  business: 'Bright Smiles Dental',
  site_url: 'brightsmiles.com',
  phone: '(555) 123-4567',
  industry: 'dental',
  email: 'Sam@BrightSmiles.com',
};

test('audit stays unlisted until there is a calling line', () => {
  assert.equal(AUDIT_LIVE, false);
  assert.equal(AUDIT_PATH, '/audit/');
});

test('launch gating: noindex,nofollow and no links until live', () => {
  assert.equal(HIDDEN_ROBOTS, 'noindex,nofollow');
  assert.equal(robotsFor(false), 'noindex,nofollow');
  assert.equal(robotsFor(undefined), 'noindex,nofollow');
  assert.equal(robotsFor(true), undefined);
  assert.equal(linksVisible(false), false);
  assert.equal(linksVisible(true), true);
  // Hidden state (current) and live state.
  assert.equal(auditRobots(), 'noindex,nofollow');
  assert.equal(showAuditLinks(), false);
  assert.equal(auditRobots(true), undefined);
  assert.equal(showAuditLinks(true), true);
});

test('the report covers the six promised checks', () => {
  assert.deepEqual(AUDIT_CHECKS.map((c) => c.key), ['answered', 'rings', 'after-hours', 'booking', 'voicemail', 'text-back']);
  for (const c of AUDIT_CHECKS) assert.ok(c.label && c.detail, c.key);
});

test('industries match the edge function keys', () => {
  assert.deepEqual(AUDIT_INDUSTRIES.map(([k]) => k), ['dental', 'legal', 'home-services', 'med-spa', 'medical', 'hvac', 'roofing', 'plumbing', 'other']);
  const fn = read('supabase/functions/apc-lead/index.ts');
  for (const [key] of AUDIT_INDUSTRIES) assert.match(fn, new RegExp(`\\["${key}", "`), `INDUSTRIES has ${key}`);
});

test('phone: 10 to 15 digits, only digits, spaces and + ( ) - .', () => {
  for (const ok of ['(555) 123-4567', '555.123.4567', '+1 555 123 4567', '5551234567', '+44 20 7946 0958', '123456789012345']) {
    assert.equal(validPhone(ok), true, ok);
  }
  for (const bad of ['', '555-1234', '1234567890123456', '555-123-4567 ext 2', 'call me', '555/123/4567', null]) {
    assert.equal(validPhone(bad), false, String(bad));
  }
  assert.equal(phoneDigits('+1 (555) 123-4567'), '15551234567');
  assert.equal(phoneDigits('555#1234567'), '');
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
  assert.equal(result.values.phone, '(555) 123-4567');
});

test('validateAuditForm flags each missing or bad field with friendly copy', () => {
  const empty = validateAuditForm({});
  assert.equal(empty.ok, false);
  assert.deepEqual(Object.keys(empty.errors).sort(), [...AUDIT_FIELDS].sort());
  const bad = validateAuditForm({ ...good, site_url: 'ftp://x', phone: '123', industry: 'spaceships', email: 'nope' });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['email', 'industry', 'phone', 'site_url']);
  for (const message of Object.values(bad.errors)) {
    assert.doesNotMatch(message, /invalid|error|wrong/i);
  }
  assert.ok(validateAuditForm({ ...good, name: '  <>  ' }).errors.name);
  assert.equal(validateAuditForm({ ...good, name: 'Sam <b>' }).values.name, 'Sam b');
});

test('payload uses site_url for the website and keeps the honeypot separate', () => {
  const { values } = validateAuditForm(good);
  const payload = buildAuditPayload(values, '');
  assert.deepEqual(Object.keys(payload).sort(), ['business', 'company_website', 'email', 'industry', 'name', 'phone', 'site_url', 'source']);
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
  assert.match(auditErrorMessage(400, 'phone'), /phone number/);
  assert.match(auditErrorMessage(500), /try again/i);
  assert.equal(AUDIT_SUCCESS.heading, "You're in.");
  assert.match(AUDIT_SUCCESS.body, /^Look for a confirmation email from Timothy/);
});

test('audit page: gated robots, honeypot, consent line, site_url field', () => {
  const page = read('src/pages/audit.astro');
  assert.match(page, /robots=\{auditRobots\(\)\}/);
  assert.match(page, /name="site_url"/);
  assert.match(page, /id="audit-company-website" name="company_website"[^>]*tabindex="-1"/);
  assert.equal((page.match(/name="company_website"/g) || []).length, 1);
  assert.match(page, /By submitting, you agree we may place one test call to the number provided and email you the report\./);
  assert.match(page, /fetch\(LEAD_ENDPOINT/);
  assert.match(page, /buildAuditPayload\(/);
  assert.match(page, /auditErrorMessage\(/);
});

test('Base renders a robots meta from the robots prop', () => {
  const base = read('src/layouts/Base.astro');
  assert.match(base, /\{robotsContent && <meta name="robots" content=\{robotsContent\}\/>\}/);
  // postbuild's noindex check matches the hidden value, so it stays out of the sitemap and IndexNow.
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
  assert.match(post, /\.\.\.\(showAuditLinks\(\)\?\[\{title:'Free missed-call audit',path:AUDIT_PATH/);
  assert.match(post, /\[showAuditLinks\(\),AUDIT_PATH\]/);
  assert.match(post, /is not live but is indexable/);
});

test('edge function: audit branch, validation and emails; other sources untouched', () => {
  const fn = read('supabase/functions/apc-lead/index.ts');
  assert.match(fn, /if \(cleanText\(body\.source, 40\) === "audit"\) return handleAudit\(body, req, headers\);/);
  assert.match(fn, /audit: \{ site_url: siteUrl, phone, requested_at: requestedAt \}/);
  assert.match(fn, /subject: "Your free missed-call audit is booked"/);
  assert.match(fn, /subject: `New audit request: \$\{business\} \(\$\{industryLabel\}\)`/);
  assert.match(fn, /error: "phone"/);
  assert.match(fn, /error: "site_url"/);
  assert.match(fn, /error: "business"/);
  assert.match(fn, /digits\.length >= 10 && digits\.length <= 15/);
  assert.match(fn, /u\.href\.length <= 200/);
  // The original overpaying/stories path is still there as before.
  assert.match(fn, /const source = cleanText\(body\.source, 40\) \|\| "overpaying";/);
  assert.match(fn, /subject: isStories \? `You're on the \$\{industryLabel\} stories list` : "Your AI receptionist price check results"/);
});
