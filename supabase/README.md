# Backend (Supabase Edge Functions)

Runs on the free Supabase project **raveaura** (ref `muupitrhtaatzgaeghyg`) in its own `aiphonecompare` schema.

| Function | URL | What it does |
| --- | --- | --- |
| `apc-lead` | `https://muupitrhtaatzgaeghyg.supabase.co/functions/v1/apc-lead` | Optional email form on `/overpaying/`. Origin allowlist, honeypot (`company_website`), validation, rate limits (5/hour per IP hash, 3/day per email, 300/day total). Inserts into `aiphonecompare.leads` (stage `lead`), then sends the welcome email via Resend from timothy@aiphonecompare.com and a heads-up to the same inbox. Also serves the stories list (`source=stories`) and the free call coverage check form on `/audit/` (`source=audit`, see below). |
| `apc-stripe-webhook` | `https://muupitrhtaatzgaeghyg.supabase.co/functions/v1/apc-stripe-webhook` | Stripe endpoint `we_1UbSEjDIQTTGLh9lg8enVdWG` (`checkout.session.completed`). Verifies the signature, logs payments for the Industry spotlight (`plink_1UYUSEDIQTTGLh9lp7mhODhB`), Done-for-you (`plink_1UbSgxDIQTTGLh9lxuqafUsQ`, `plink_1UbSh6DIQTTGLh9lNnNdDoCZ`) and Competitor teardown (`plink_1UbSr1DIQTTGLh9lGvqLAYW5`, custom field `company_website`) as `source=stripe`, `stage=active_client` (one row per checkout session), and sends the matching thank-you / intake email (the teardown one asks for vendor name, competitors and goals). |

### `source=audit` (free call coverage check)

Same origin allowlist, honeypot (`company_website`, which is **not** the business website) and per-IP / per-email limits, plus 50 checks/day total. Requires `email`, `business` and `site_url` (http(s), scheme added if missing, max 200 chars); `name` is optional. `industry` is one of `dental`, `legal`, `home-services`, `med-spa`, `medical`, `hvac`, `roofing`, `plumbing`, `other` (anything else is stored as `other`). Stores `payload.audit = { site_url, requested_at }`, sends the "Your free call coverage check is confirmed" email, and sends timothy@aiphonecompare.com a "New call coverage check: <business> (<industry>)" email with every field so the public-info review can be run. Field errors come back as `400 { error: "email" | "business" | "site_url" }`. Other sources are unchanged. We never place a test call.

The page is gated by `AUDIT_LIVE` in `src/lib/audit.mjs`: while false it builds and the form works, but it is noindex and unlinked. When true, it is indexable, in the sitemap, and linked from the home, done-for-you, industry and footer pages.

Both are deployed with `verify_jwt = false` because they do their own checks (origin/honeypot/rate limit, or the Stripe signature).

Secrets live in Supabase Vault (`apc_resend_api_key`, `apc_stripe_webhook_secret`) and are read over the built-in `SUPABASE_DB_URL` connection. Nothing secret is in this repo.

Deploy: Supabase connector `deploy_edge_function` with files `<name>/index.ts` and `_shared/common.ts`, entrypoint `<name>/index.ts`, `verify_jwt: false`.
