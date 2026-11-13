// Fire a PostHog event if PostHog is running. PostHog.astro may never start it
// (no key, or Do Not Track), so this is a no-op until 'apc:posthog-ready'.
// Never pass an email address or a name here.
export function track(event, properties = {}) {
  if (typeof window === 'undefined') return;
  const send = () => {
    try {
      window.posthog?.capture?.(event, properties);
    } catch {
      // Analytics must never break the page.
    }
  };
  if (window.posthog) send();
  else window.addEventListener('apc:posthog-ready', send, { once: true });
}
