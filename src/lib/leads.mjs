// Optional "send me these results" form. The endpoint lives here only, so it is
// easy to change. Results are already on the page; the email is optional.
import { MAX_OPTIONS, overpayingUrl } from './overpaying.mjs';

export const LEAD_ENDPOINT = 'https://muupitrhtaatzgaeghyg.supabase.co/functions/v1/apc-lead';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validEmail(value) {
  const text = String(value || '').trim();
  return text.length <= 320 && EMAIL_RE.test(text);
}

function text(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

// Body for LEAD_ENDPOINT. `result` is the object from checkOverpaying; the
// matches are the options shown on the page, capped at MAX_OPTIONS. The
// honeypot value is passed through untouched so the endpoint can judge it.
export function buildLeadPayload({ email, name, business, honeypot }, result) {
  const { input } = result;
  return {
    email: text(email, 320),
    name: text(name, 120),
    business: text(business, 160),
    industry: input.industry,
    source: 'overpaying',
    company_website: honeypot == null ? '' : String(honeypot),
    monthly_cost: input.cost ?? 0,
    monthly_calls: input.calls,
    call_minutes: input.minutes,
    results_url: overpayingUrl(input),
    matches: result.options.slice(0, MAX_OPTIONS).map((row) => ({
      vendor: row.name,
      plan: row.planName,
      monthly: row.monthlyCents / 100,
    })),
  };
}
