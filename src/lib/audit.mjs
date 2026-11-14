// Free call coverage check (/audit/): what we review, the form fields, and the
// validation shared by the page and the tests. The edge function repeats the
// same rules server-side (supabase/functions/apc-lead/index.ts).
import { linksVisible, robotsFor } from './launch.mjs';
import { validEmail } from './leads.mjs';

// When true, /audit/ is indexable, listed in sitemap/llms/IndexNow, and linked
// from the home, done-for-you, industry and footer pages.
export const AUDIT_LIVE = true;

export const AUDIT_PATH = '/audit/';
export const AUDIT_EMAIL = 'timothy@aiphonecompare.com';

export const AUDIT_SUMMARY = 'Free call coverage check: we review your public website, Google Business Profile and public reviews (we never place a test call) and email a one-page report within 1 business day. No obligation.';

// What the one-page report covers, in report order. All of this is public
// information. We never place a test call.
export const AUDIT_CHECKS = [
  { key: 'click-to-call', label: 'Click-to-call on mobile', detail: 'Whether a visitor on a phone can tap a number on your site and place a call.' },
  { key: 'hours', label: 'Hours on your website', detail: 'Whether your open hours are easy to find, including midday breaks and weekend closures.' },
  { key: 'after-hours', label: 'After-hours instructions', detail: 'What a visitor is told to do when you are closed: an emergency option, a next step, or a way to leave a request.' },
  { key: 'booking', label: 'Online booking', detail: 'Whether someone can request or book an appointment on your site without waiting on a call.' },
  { key: 'chat-text', label: 'Chat or text options', detail: 'Whether your site offers chat, SMS or another way to message you besides a phone call.' },
  { key: 'contact-form', label: 'Contact form', detail: 'Whether there is a working contact form, and what a visitor is told will happen after they write.' },
  { key: 'gbp', label: 'Google Business Profile', detail: 'Whether your public listing shows matching hours, a phone number and a website, so searchers can reach you.' },
  { key: 'reviews', label: 'What callers already say', detail: 'Public reviews that mention reaching you by phone, quoted with links. We only use real reviews, and we treat them as opportunities.' },
];

// Value, label. Keys match the INDUSTRIES map in the edge function.
export const AUDIT_INDUSTRIES = [
  ['dental', 'Dental'],
  ['legal', 'Legal'],
  ['home-services', 'Home services'],
  ['med-spa', 'Med spa'],
  ['medical', 'Medical'],
  ['hvac', 'HVAC'],
  ['roofing', 'Roofing'],
  ['plumbing', 'Plumbing'],
  ['other', 'Other'],
];
const INDUSTRY_KEYS = new Set(AUDIT_INDUSTRIES.map(([key]) => key));

export const AUDIT_LIMITS = { name: 60, business: 120, site_url: 200, email: 254 };

// "example.com" -> "https://example.com/". Returns '' for anything that is
// not an http(s) address with a dotted host, or is longer than 200 characters.
export function normalizeWebsite(value) {
  const raw = String(value ?? '').trim();
  if (!raw || /\s/.test(raw)) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return '';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname)) return '';
  if (url.username || url.password) return '';
  const href = url.href;
  return href.length <= AUDIT_LIMITS.site_url ? href : '';
}

function clean(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
}

const MESSAGES = {
  name: 'Add your name so we know who to address the report to.',
  business: 'Add your business name.',
  site_url: 'Add your website, like yourbusiness.com.',
  industry: 'Pick the closest industry. "Other" is fine.',
  email: 'Add an email address, like name@example.com.',
};

// Field order for focusing the first error.
export const AUDIT_FIELDS = ['name', 'business', 'site_url', 'industry', 'email'];

// Validates the form fields. Returns { ok, errors, values } where values are
// cleaned and normalized, ready for buildAuditPayload.
export function validateAuditForm(fields = {}) {
  const values = {
    name: clean(fields.name, AUDIT_LIMITS.name),
    business: clean(fields.business, AUDIT_LIMITS.business),
    site_url: normalizeWebsite(fields.site_url),
    industry: INDUSTRY_KEYS.has(String(fields.industry ?? '')) ? String(fields.industry) : '',
    email: clean(fields.email, AUDIT_LIMITS.email).toLowerCase(),
  };
  const errors = {};
  if (!values.name) errors.name = MESSAGES.name;
  if (!values.business) errors.business = MESSAGES.business;
  if (!values.site_url) errors.site_url = String(fields.site_url ?? '').trim() ? 'That website address does not look right. Try yourbusiness.com.' : MESSAGES.site_url;
  if (!values.industry) errors.industry = MESSAGES.industry;
  if (!validEmail(values.email)) errors.email = String(fields.email ?? '').trim() ? 'That email does not look right. Try name@example.com.' : MESSAGES.email;
  return { ok: Object.keys(errors).length === 0, errors, values };
}

// Body for LEAD_ENDPOINT. The business website goes in site_url; the hidden
// honeypot field company_website is passed through untouched for the endpoint.
export function buildAuditPayload(values, honeypot) {
  return {
    source: 'audit',
    name: values.name,
    business: values.business,
    site_url: values.site_url,
    industry: values.industry,
    email: values.email,
    company_website: honeypot == null ? '' : String(honeypot),
  };
}

// Status copy after a POST that did not succeed. `error` is the endpoint's
// error code when it sent one.
export function auditErrorMessage(status, error) {
  if (status === 429 || error === 'rate_limited') return 'We have had a few requests from this connection already. Give it a little while, then try again, or email timothy@aiphonecompare.com and we will set it up for you.';
  if (status === 0) return "That didn't go through, possibly a connection hiccup. Try again in a moment, or email timothy@aiphonecompare.com.";
  if (error && MESSAGES[error]) return MESSAGES[error];
  return "That didn't go through. Check the details above and try again, or email timothy@aiphonecompare.com.";
}

export const AUDIT_SUCCESS = {
  heading: "You're in.",
  body: 'Look for a confirmation email from Timothy (timothy@aiphonecompare.com) in the next few minutes. We will review your public website, Google Business Profile and public reviews — we never place a test call — and email your one-page report within 1 business day.',
};

// Base `robots` prop and link visibility for the audit page.
export function auditRobots(live = AUDIT_LIVE) {
  return robotsFor(live);
}
export function showAuditLinks(live = AUDIT_LIVE) {
  return linksVisible(live);
}
