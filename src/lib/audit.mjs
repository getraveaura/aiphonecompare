// Free missed-call audit (/audit/): what we check, the form fields, and the
// validation shared by the page and the tests. The edge function repeats the
// same rules server-side (supabase/functions/apc-lead/index.ts).
import { linksVisible, robotsFor } from './launch.mjs';
import { validEmail } from './leads.mjs';

// Off until we have a calling line. While false, /audit/ builds and its form
// works, but it is noindex,nofollow, left out of sitemap/llms/IndexNow, and no
// page links to it.
export const AUDIT_LIVE = false;

export const AUDIT_PATH = '/audit/';
export const AUDIT_EMAIL = 'timothy@aiphonecompare.com';

export const AUDIT_SUMMARY = 'Free missed-call audit: we place one short, polite after-hours test call to your business line and email a one-page report within 1 business day. No obligation.';

// What the one-page report scores, in report order.
export const AUDIT_CHECKS = [
  { key: 'answered', label: 'Was it answered?', detail: 'Whether a person, an answering service or an AI picked up, or the call went unanswered.' },
  { key: 'rings', label: 'Rings to answer', detail: 'How many rings a caller waits before anyone, or anything, picks up.' },
  { key: 'after-hours', label: 'After-hours handling', detail: 'What a caller hears outside your hours: a greeting, your hours, an emergency option, or silence.' },
  { key: 'booking', label: 'Was booking offered?', detail: 'Whether the caller is offered a way to book, schedule or request a callback.' },
  { key: 'voicemail', label: 'Voicemail quality', detail: 'If it reaches voicemail: is the greeting clear, current and inviting, and is the box accepting messages?' },
  { key: 'text-back', label: 'Text-back', detail: 'Whether a text arrives after a missed call, and how quickly.' },
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

export const AUDIT_LIMITS = { name: 60, business: 120, site_url: 200, phone: 40, email: 254 };

const PHONE_CHARS = /^[0-9+().\-\s]+$/;

// Digits only, or '' when the value has characters a phone number should not.
export function phoneDigits(value) {
  const raw = String(value ?? '').trim();
  if (!raw || !PHONE_CHARS.test(raw)) return '';
  return raw.replace(/\D/g, '');
}

// Digits, spaces and + ( ) - . only, with 10 to 15 digits.
export function validPhone(value) {
  const digits = phoneDigits(value);
  return digits.length >= 10 && digits.length <= 15;
}

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
  phone: 'Add the business phone number customers call, with area code.',
  industry: 'Pick the closest industry. "Other" is fine.',
  email: 'Add an email address, like name@example.com.',
};

// Field order for focusing the first error.
export const AUDIT_FIELDS = ['name', 'business', 'site_url', 'phone', 'industry', 'email'];

// Validates the form fields. Returns { ok, errors, values } where values are
// cleaned and normalized, ready for buildAuditPayload.
export function validateAuditForm(fields = {}) {
  const values = {
    name: clean(fields.name, AUDIT_LIMITS.name),
    business: clean(fields.business, AUDIT_LIMITS.business),
    site_url: normalizeWebsite(fields.site_url),
    phone: clean(fields.phone, AUDIT_LIMITS.phone),
    industry: INDUSTRY_KEYS.has(String(fields.industry ?? '')) ? String(fields.industry) : '',
    email: clean(fields.email, AUDIT_LIMITS.email).toLowerCase(),
  };
  const errors = {};
  if (!values.name) errors.name = MESSAGES.name;
  if (!values.business) errors.business = MESSAGES.business;
  if (!values.site_url) errors.site_url = String(fields.site_url ?? '').trim() ? 'That website address does not look right. Try yourbusiness.com.' : MESSAGES.site_url;
  if (!validPhone(values.phone)) errors.phone = String(fields.phone ?? '').trim() ? 'That number does not look right. Use 10 to 15 digits, like (555) 123-4567.' : MESSAGES.phone;
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
    phone: values.phone,
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
  body: 'Look for a confirmation email from Timothy (timothy@aiphonecompare.com) in the next few minutes. We will place one short after-hours test call to your business line and email your one-page report within 1 business day.',
};

// Base `robots` prop and link visibility for the audit page.
export function auditRobots(live = AUDIT_LIVE) {
  return robotsFor(live);
}
export function showAuditLinks(live = AUDIT_LIVE) {
  return linksVisible(live);
}
