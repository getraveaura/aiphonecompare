// POST /functions/v1/apc-lead
// Inserts an aiphonecompare lead (from the free overpaying check) and sends
// the welcome email right away. Abuse protection: origin allowlist, honeypot,
// strict validation, and per-IP / per-email / global rate limits.
import { button, esc, json, sendEmail, sha256, shell, sql, SITE } from "../_shared/common.ts";

const ALLOWED_ORIGINS = new Set([
  "https://aiphonecompare.com",
  "https://www.aiphonecompare.com",
  "https://getraveaura.github.io",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
]);
const INDUSTRIES = new Map([
  ["all", "All industries"],
  ["dental", "Dental"],
  ["legal", "Legal"],
  ["plumbing", "Home services"],
  ["medical", "Medical"],
  ["hvac", "HVAC"],
  ["roofing", "Roofing"],
  ["other", "Other"],
]);
const EMAIL_RE = /^[^@\s<>"']{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://aiphonecompare.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function cleanText(v: unknown, max: number): string {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max);
}
function num(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function usd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

async function rateLimited(keys: [string, number, string][]): Promise<boolean> {
  // keys: [key, max hits, window]
  for (const [key, max, window] of keys) {
    const rows = await sql`select count(*)::int as n from aiphonecompare.rate_limits where key = ${key} and hit_at > now() - ${window}::interval`;
    if ((rows[0]?.n ?? 0) >= max) return true;
  }
  for (const [key] of keys) await sql`insert into aiphonecompare.rate_limits (key) values (${key})`;
  if (Math.random() < 0.05) await sql`delete from aiphonecompare.rate_limits where hit_at < now() - interval '2 days'`;
  return false;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, headers);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin" }, 403, headers);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 8000) return json({ ok: false, error: "too_large" }, 413, headers);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_json" }, 400, headers);
  }

  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (cleanText(body.company_website, 200) !== "") return json({ ok: true }, 200, headers);

  const email = cleanText(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "email" }, 400, headers);
  const name = cleanText(body.name, 60);
  const business = cleanText(body.business, 120);
  const industry = INDUSTRIES.has(String(body.industry)) ? String(body.industry) : "all";
  const source = cleanText(body.source, 40) || "overpaying";
  const monthlyCost = num(body.monthly_cost, 0, 100000);
  const monthlyCalls = num(body.monthly_calls, 0, 100000);
  const callMinutes = num(body.call_minutes, 0, 240);

  let resultsUrl = `${SITE}/overpaying/`;
  try {
    const u = new URL(String(body.results_url ?? ""));
    if (u.origin === SITE && u.pathname.startsWith("/overpaying/")) resultsUrl = u.toString();
  } catch { /* fall back to the plain page */ }

  const matches = (Array.isArray(body.matches) ? body.matches : [])
    .slice(0, 5)
    .map((m: Record<string, unknown>) => ({
      vendor: cleanText(m?.vendor, 60),
      plan: cleanText(m?.plan, 60),
      monthly: num(m?.monthly, 0, 1000000),
    }))
    .filter((m) => m.vendor && m.monthly != null);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = (await sha256(`apc:${ip}`)).slice(0, 32);
  const emailHash = (await sha256(`apc:${email}`)).slice(0, 32);
  if (await rateLimited([
    [`ip:${ipHash}`, 5, "1 hour"],
    [`email:${emailHash}`, 3, "1 day"],
    ["global", 300, "1 day"],
  ])) {
    return json({ ok: false, error: "rate_limited" }, 429, headers);
  }

  const payload = {
    monthly_cost: monthlyCost,
    monthly_calls: monthlyCalls,
    call_minutes: callMinutes,
    results_url: resultsUrl,
    matches,
    user_agent: cleanText(req.headers.get("user-agent"), 200),
    welcome_email: null as unknown,
  };

  const inserted = await sql`
    insert into aiphonecompare.leads (email, name, business, industry, source, stage, payload)
    values (${email}, ${name || null}, ${business || null}, ${industry}, ${source}, 'lead', ${sql.json(payload)})
    returning id`;
  const leadId = inserted[0].id as string;

  // Welcome email, sent in code right after the insert.
  const hi = name ? `Hi ${esc(name)},` : "Hi there,";
  const industryLabel = INDUSTRIES.get(industry)!;
  const cheaper = monthlyCost != null ? matches.filter((m) => (m.monthly as number) < monthlyCost) : [];
  const lines: string[] = [];
  if (monthlyCost != null) {
    lines.push(`You told us you pay about <strong>${usd(monthlyCost)}/month</strong>` +
      (monthlyCalls != null ? ` for roughly ${monthlyCalls.toLocaleString("en-US")} calls` : "") +
      (callMinutes != null ? ` at about ${callMinutes} min each` : "") + ` (${esc(industryLabel)}).`);
  }
  const rows = matches.map((m) =>
    `<tr><td style="padding:8px 0;border-top:1px solid #eeeeea;">${esc(m.vendor)}${m.plan ? ` · ${esc(m.plan)}` : ""}</td><td style="padding:8px 0;border-top:1px solid #eeeeea;text-align:right;white-space:nowrap;">${usd(m.monthly as number)}/mo est.</td></tr>`
  ).join("");
  const table = rows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;font-size:14px;">${rows}</table>`
    : "";
  const summary = monthlyCost == null
    ? ""
    : cheaper.length
    ? `<p>Good news: ${cheaper.length} of the verified plans we matched come in under what you pay now, based on published prices.</p>`
    : `<p>Good news: your current price already holds up well against the verified plans we matched.</p>`;

  const html = shell(`
<p>${hi}</p>
<p>Thanks for running the free AI receptionist price check. Your full results are saved here, so you can come back any time:</p>
${button(resultsUrl, "See your full results")}
${lines.map((l) => `<p>${l}</p>`).join("")}
${summary}
${table}
<p style="font-size:13px;color:#6b6b66;">Estimates use each vendor's published pricing page. Every price on the results page links to its source and the date we checked it.</p>
<p>If you'd like a second pair of eyes on which plan fits your calls best, just reply to this email. I read every reply.</p>
<p>Timothy<br><span style="color:#6b6b66;">aiphonecompare.com</span></p>`);
  const text = [
    name ? `Hi ${name},` : "Hi there,",
    "",
    "Thanks for running the free AI receptionist price check. Your full results are saved here:",
    resultsUrl,
    "",
    ...matches.map((m) => `- ${m.vendor}${m.plan ? ` · ${m.plan}` : ""}: ${usd(m.monthly as number)}/mo est.`),
    "",
    "Estimates use each vendor's published pricing page. Every price on the results page links to its source.",
    "",
    "If you'd like a second pair of eyes on which plan fits your calls best, just reply. I read every reply.",
    "",
    "Timothy",
    "aiphonecompare.com",
  ].join("\n");

  const isStories = source === "stories";
  const storiesHtml = shell(`
<p>${hi}</p>
<p>You're on the list for <strong>${esc(industryLabel)}</strong>. When we add a sourced customer story or log a vendor price change for that industry, we'll send you a short note.</p>
<p>Every story and price on the site links to its source, so you can always check the details yourself.</p>
${button(`${SITE}/stories/`, "Read the latest stories")}
<p>While you're here, the free price check shows what your calls would cost on every plan with published pricing:</p>
<p><a href="${SITE}/overpaying/" style="color:#1f5f4a;">aiphonecompare.com/overpaying</a></p>
<p>To leave the list, just reply to any email.</p>
<p>Timothy<br><span style="color:#6b6b66;">aiphonecompare.com</span></p>`);
  const storiesText = `${name ? `Hi ${name},` : "Hi there,"}\n\nYou're on the list for ${industryLabel}. When we add a sourced customer story or log a vendor price change for that industry, we'll send you a short note.\n\nLatest stories: ${SITE}/stories/\nFree price check: ${SITE}/overpaying/\n\nTo leave the list, just reply to any email.\n\nTimothy\naiphonecompare.com`;
  const sent = await sendEmail({
    to: email,
    subject: isStories ? `You're on the ${industryLabel} stories list` : "Your AI receptionist price check results",
    html: isStories ? storiesHtml : html,
    text: isStories ? storiesText : text,
    tags: [{ name: "type", value: "welcome" }, { name: "source", value: source.replace(/[^a-zA-Z0-9_-]/g, "") || "overpaying" }],
  });
  await sql`update aiphonecompare.leads set payload = payload || ${sql.json({ welcome_email: { ...sent, at: new Date().toISOString() } })} where id = ${leadId}`;

  // Internal heads-up to our own inbox (not to the lead).
  await sendEmail({
    to: "timothy@aiphonecompare.com",
    subject: `New lead (${source}): ${industryLabel}${monthlyCost != null ? `, ${usd(monthlyCost)}/mo` : ""}`,
    html: shell(`<p>New lead ${esc(leadId)} from <strong>${esc(source)}</strong>.</p><p>${esc(email)}${name ? ` · ${esc(name)}` : ""}${business ? ` · ${esc(business)}` : ""}</p><p>Welcome email: ${sent.ok ? "sent" : "FAILED " + esc(sent.error)}</p><p><a href="${esc(resultsUrl)}">Their results</a></p>`),
    text: `New lead ${leadId} from ${source}: ${email}. Welcome email ${sent.ok ? "sent" : "FAILED"}. ${resultsUrl}`,
    tags: [{ name: "type", value: "internal" }],
  }).catch(() => null);

  return json({ ok: true, welcome: sent.ok }, 200, headers);
});
