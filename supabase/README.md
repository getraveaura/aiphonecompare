# Backend (Supabase Edge Functions)

Runs on the free Supabase project **raveaura** (ref `muupitrhtaatzgaeghyg`) in its own `aiphonecompare` schema.

| Function | URL | What it does |
| --- | --- | --- |
| `apc-lead` | `https://muupitrhtaatzgaeghyg.supabase.co/functions/v1/apc-lead` | Optional email form on `/overpaying/`. Origin allowlist, honeypot (`company_website`), validation, rate limits (5/hour per IP hash, 3/day per email, 300/day total). Inserts into `aiphonecompare.leads` (stage `lead`), then sends the welcome email via Resend from timothy@aiphonecompare.com and a heads-up to the same inbox. |
| `apc-stripe-webhook` | `https://muupitrhtaatzgaeghyg.supabase.co/functions/v1/apc-stripe-webhook` | Stripe endpoint `we_1UbSEjDIQTTGLh9lg8enVdWG` (`checkout.session.completed`). Verifies the signature, logs payments for the Industry spotlight (`plink_1UYUSEDIQTTGLh9lp7mhODhB`), Done-for-you (`plink_1UbSgxDIQTTGLh9lxuqafUsQ`, `plink_1UbSh6DIQTTGLh9lNnNdDoCZ`) and Competitor teardown (`plink_1UbSr1DIQTTGLh9lGvqLAYW5`, custom field `company_website`) as `source=stripe`, `stage=active_client` (one row per checkout session), and sends the matching thank-you / intake email (the teardown one asks for vendor name, competitors and goals). |

Both are deployed with `verify_jwt = false` because they do their own checks (origin/honeypot/rate limit, or the Stripe signature).

Secrets live in Supabase Vault (`apc_resend_api_key`, `apc_stripe_webhook_secret`) and are read over the built-in `SUPABASE_DB_URL` connection. Nothing secret is in this repo.

Deploy: Supabase connector `deploy_edge_function` with files `<name>/index.ts` and `_shared/common.ts`, entrypoint `<name>/index.ts`, `verify_jwt: false`.
