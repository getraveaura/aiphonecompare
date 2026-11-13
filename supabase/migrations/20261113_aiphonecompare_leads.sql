-- Applied 2026-11-13 to Supabase project "raveaura" (ref muupitrhtaatzgaeghyg).
-- The free plan allows 2 active projects, so aiphonecompare lives in its own
-- schema there. RLS is on with no policies: only the edge functions (service
-- connection) can read or write.
create schema if not exists aiphonecompare;
revoke all on schema aiphonecompare from public, anon, authenticated;

create table aiphonecompare.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (char_length(name) <= 120),
  business text check (char_length(business) <= 160),
  industry text check (char_length(industry) <= 60),
  source text not null default 'overpaying' check (char_length(source) <= 40),
  stage text not null default 'lead' check (stage in ('lead','ready','in_progress','delivered','proposal','active_client')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index leads_email_idx on aiphonecompare.leads (lower(email));
create index leads_created_idx on aiphonecompare.leads (created_at desc);
create unique index leads_stripe_session_uidx on aiphonecompare.leads ((payload->>'stripe_session_id')) where source = 'stripe';
alter table aiphonecompare.leads enable row level security;
alter table aiphonecompare.leads force row level security;

create table aiphonecompare.rate_limits (
  key text not null,
  hit_at timestamptz not null default now()
);
create index rate_limits_key_idx on aiphonecompare.rate_limits (key, hit_at desc);
alter table aiphonecompare.rate_limits enable row level security;
revoke all on all tables in schema aiphonecompare from public, anon, authenticated;

-- Secrets are stored in Supabase Vault (NOT in this repo):
--   apc_resend_api_key         sending-only Resend key restricted to aiphonecompare.com
--   apc_stripe_webhook_secret  signing secret for Stripe webhook we_1UbSEjDIQTTGLh9lg8enVdWG
