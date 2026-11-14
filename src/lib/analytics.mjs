// Fire a PostHog event if PostHog is running. PostHog.astro may never start it
// (no key, or Do Not Track), so this is a no-op until 'apc:posthog-ready'.
// Never pass an email address or a name here.

import { DFY_OFFERS, SPOTLIGHT, TEARDOWN } from './offers.mjs';

export const EVENTS = {
  checkout: 'offer_checkout_click',
  contact: 'contact_click',
  lead: 'lead_submit',
  tool: 'tool_used',
  vendor: 'vendor_outbound_click',
};

// One place for offer name + price tier on pay-button clicks.
export const CHECKOUT_OFFERS = {
  spotlight: { offer: 'spotlight', price_tier: 'spotlight', price: SPOTLIGHT.price, url: SPOTLIGHT.url },
  teardown: { offer: 'teardown', price_tier: 'teardown', price: TEARDOWN.price, url: TEARDOWN.url },
  dfy_founding: { offer: 'dfy_founding', price_tier: 'dfy_founding', price: DFY_OFFERS.founding.price, url: DFY_OFFERS.founding.url },
  dfy_standard: { offer: 'dfy_standard', price_tier: 'dfy_standard', price: DFY_OFFERS.standard.price, url: DFY_OFFERS.standard.url },
};

const BLOCKED_KEYS = /^(email|e-?mail|name|first_?name|last_?name|full_?name|phone|business(_?name)?|company(_?name)?|address)$/i;

export function sanitizeProperties(properties = {}) {
  const out = {};
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_KEYS.test(key)) continue;
    if (typeof value === 'string' && /@[^@\s]+\.[^@\s]+/.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export function track(event, properties = {}) {
  if (typeof window === 'undefined') return;
  const payload = sanitizeProperties(properties);
  const send = () => {
    try {
      window.posthog?.capture?.(event, payload);
    } catch {
      // Analytics must never break the page.
    }
  };
  if (window.posthog) send();
  else if (!window.__apcPosthogSkipped) {
    window.addEventListener('apc:posthog-ready', send, { once: true });
  }
}

export function checkoutProperties(tier) {
  const row = CHECKOUT_OFFERS[tier];
  if (!row) return null;
  return { offer: row.offer, price_tier: row.price_tier, price: row.price };
}

export function offerFromStripeUrl(href) {
  if (typeof href !== 'string' || !href) return null;
  for (const [tier, row] of Object.entries(CHECKOUT_OFFERS)) {
    if (href === row.url || href.startsWith(`${row.url}?`) || href.startsWith(`${row.url}#`)) return tier;
  }
  return null;
}

// Share-via-email links are mailto:?subject=... with no address; those are not contact CTAs.
// Never include the email address in the returned properties.
export function contactProperties(href) {
  if (typeof href !== 'string' || !/^mailto:/i.test(href)) return null;
  const rest = href.slice(href.indexOf(':') + 1);
  const qIndex = rest.indexOf('?');
  const address = (qIndex === -1 ? rest : rest.slice(0, qIndex)).trim();
  const query = qIndex === -1 ? '' : rest.slice(qIndex + 1);
  if (!address) return null;
  const properties = {};
  try {
    const subject = new URLSearchParams(query).get('subject');
    if (subject) properties.subject = subject;
  } catch {
    // Ignore a malformed query string.
  }
  return properties;
}

export function vendorProperties(slug, isReferral) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  return {
    vendor: slug.trim(),
    is_referral: isReferral === true || isReferral === '1' || isReferral === 'true',
  };
}

export function eventFromClick(target) {
  if (!target || typeof target.closest !== 'function') return null;

  const checkoutEl = target.closest('[data-offer-checkout], a[href*="buy.stripe.com"]');
  if (checkoutEl) {
    const tier = checkoutEl.getAttribute('data-offer-checkout') || offerFromStripeUrl(checkoutEl.getAttribute('href'));
    const properties = checkoutProperties(tier);
    if (properties) return { event: EVENTS.checkout, properties };
  }

  const vendorEl = target.closest('[data-vendor-slug]');
  if (vendorEl) {
    const properties = vendorProperties(
      vendorEl.getAttribute('data-vendor-slug'),
      vendorEl.getAttribute('data-vendor-referral'),
    );
    if (properties) return { event: EVENTS.vendor, properties };
  }

  const mailEl = target.closest('a[href^="mailto:"]');
  if (mailEl) {
    const properties = contactProperties(mailEl.getAttribute('href'));
    if (properties) return { event: EVENTS.contact, properties };
  }

  return null;
}

export function bindClickTracking() {
  if (typeof document === 'undefined' || document.documentElement.dataset.apcAnalytics === 'bound') return;
  document.documentElement.dataset.apcAnalytics = 'bound';
  document.addEventListener('click', (event) => {
    const hit = eventFromClick(event.target);
    if (hit) track(hit.event, hit.properties);
  });
}
