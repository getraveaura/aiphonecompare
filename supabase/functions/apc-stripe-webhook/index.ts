// POST /functions/v1/apc-stripe-webhook
// Stripe webhook for the $49 Industry spotlight Payment Link. Verifies the
// Stripe signature, logs the payment to aiphonecompare.leads
// (stage active_client, source stripe, idempotent per checkout session), and
// sends a thank-you email with next steps.
import { button, esc, json, secret, sendEmail, shell, sql } from "../_shared/common.ts";

const OFFERS: Record<string, { name: string; sku: string; tier: string }> = {
  plink_1UYUSEDIQTTGLh9lp7mhODhB: { name: "Industry spotlight (30 days)", sku: "industry-spotlight-30d", tier: "spotlight" },
  plink_1UbSgxDIQTTGLh9lxuqafUsQ: { name: "Done-for-you AI receptionist setup", sku: "done-for-you-setup", tier: "founding" },
  plink_1UbSh6DIQTTGLh9lNnNdDoCZ: { name: "Done-for-you AI receptionist setup", sku: "done-for-you-setup", tier: "standard" },
};
// deno-lint-ignore no-explicit-any
function offerFor(s: any) {
  if (s.payment_link && OFFERS[s.payment_link]) return OFFERS[s.payment_link];
  const sku = s.metadata?.sku;
  if (sku === "industry-spotlight-30d") return OFFERS.plink_1UYUSEDIQTTGLh9lp7mhODhB;
  if (sku === "done-for-you-setup") {
    return { ...OFFERS.plink_1UbSh6DIQTTGLh9lNnNdDoCZ, tier: s.metadata?.tier === "founding" ? "founding" : "standard" };
  }
  return null;
}

function spotlightEmail(to: string, first: string, paid: string) {
  const hi = first ? `Hi ${esc(first)},` : "Hi there,";
  return {
    to,
    subject: "Thank you! Next steps for your aiphonecompare spotlight",
    html: shell(`
<p>${hi}</p>
<p>Thank you for booking an Industry spotlight on aiphonecompare. We received ${esc(paid)}, and your receipt comes separately from Stripe.</p>
<p><strong>Next step:</strong> just reply to this email with:</p>
<ol style="padding-left:20px;margin:0 0 14px 0;">
<li>Your company name and website</li>
<li>The industry page you'd like the spotlight on (dental, legal, home services or medical)</li>
<li>One short line you'd like shown, plus the page you want it to link to</li>
</ol>
<p>Your spotlight runs for 30 days at the top of that industry page, labeled Sponsored. We'll confirm the go-live date once it's up, usually within one business day of your reply.</p>
<p style="font-size:13px;color:#6b6b66;">Sponsored spots are always labeled. Rankings, listings and verified prices are never for sale, which is what keeps the page worth being seen on. Refund terms: aiphonecompare.com/refunds/</p>
${button("https://aiphonecompare.com/get-featured/", "View spotlight details")}
<p>Thanks again,<br>Timothy<br><span style="color:#6b6b66;">aiphonecompare.com</span></p>`),
    text: `${first ? `Hi ${first},` : "Hi there,"}\n\nThank you for booking an Industry spotlight on aiphonecompare. We received ${paid}; your receipt comes separately from Stripe.\n\nNext step: reply with (1) your company name and website, (2) the industry page you want (dental, legal, home services or medical), (3) one short line to show plus the link.\n\nYour spotlight runs 30 days at the top of that industry page, labeled Sponsored. We'll confirm the go-live date once it's up, usually within one business day of your reply.\n\nRankings, listings and verified prices are never for sale. Refund terms: https://aiphonecompare.com/refunds/\n\nThanks again,\nTimothy\naiphonecompare.com`,
    tags: [{ name: "type", value: "stripe_thanks" }],
  };
}

function dfyEmail(to: string, first: string, paid: string, tier: string) {
  const hi = first ? `Hi ${esc(first)},` : "Hi there,";
  const fee = tier === "founding" ? "founding-rate" : "";
  return {
    to,
    subject: "Welcome! 4 quick things to start your AI receptionist setup",
    html: shell(`
<p>${hi}</p>
<p>Welcome aboard, and thank you. We received ${esc(paid)} for your ${fee ? "founding-rate " : ""}done-for-you AI receptionist setup. Your receipt comes separately from Stripe.</p>
<p>To get started, just reply to this email with these four things. Short answers are perfect:</p>
<ol style="padding-left:20px;margin:0 0 14px 0;">
<li><strong>Your business website</strong></li>
<li><strong>Your current phone setup</strong>: who or what answers today (front desk, voicemail, an answering service or another AI receptionist), and your phone provider if you know it</li>
<li><strong>The hours you'd like covered</strong> (for example after hours only, lunch, or all day)</li>
<li><strong>Your baseline numbers</strong>: an export of the last 14 days from your phone system's call log, plus how many appointments were booked by phone in that time. If an export is tricky, view-only access to the call log and your booking system works too.</li>
</ol>
<p>That's all we need. Once we have it, we pick the best-fit receptionist from verified prices, set it up, run 20 test calls, and go live within 7 business days. You'll get written results reports at day 30 and day 60.</p>
<p style="font-size:13px;color:#6b6b66;">Your results guarantee: if neither result is reached by day 60 (at least 90% of calls in covered hours captured, or phone-booked appointments at least 15% higher per week than your baseline), you get a full refund of our fee. Full terms: aiphonecompare.com/refunds/</p>
${button("https://aiphonecompare.com/done-for-you/", "See what's included")}
<p>Looking forward to it,<br>Timothy<br><span style="color:#6b6b66;">aiphonecompare.com</span></p>`),
    text: `${first ? `Hi ${first},` : "Hi there,"}\n\nWelcome aboard, and thank you. We received ${paid} for your ${fee ? "founding-rate " : ""}done-for-you AI receptionist setup. Your receipt comes separately from Stripe.\n\nTo get started, just reply with:\n1. Your business website\n2. Your current phone setup (who or what answers today, and your phone provider if you know it)\n3. The hours you'd like covered\n4. Your baseline: an export of the last 14 days of your call log, plus how many appointments were booked by phone in that time (or view-only access to the call log and booking system)\n\nThen we pick the best-fit receptionist from verified prices, set it up, run 20 test calls, and go live within 7 business days. Written results reports at day 30 and day 60.\n\nResults guarantee: if neither result is reached by day 60 (90%+ of calls in covered hours captured, or phone-booked appointments 15%+ higher per week than baseline), full refund of our fee. Terms: https://aiphonecompare.com/refunds/\n\nLooking forward to it,\nTimothy\naiphonecompare.com`,
    tags: [{ name: "type", value: "dfy_intake" }],
  };
}
const TOLERANCE_S = 300;

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function verify(raw: string, header: string | null, whsec: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(whsec), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  return sigs.some((s) => safeEqual(s, expected));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const raw = await req.text();
  const whsec = await secret("apc_stripe_webhook_secret");
  if (!(await verify(raw, req.headers.get("stripe-signature"), whsec))) {
    return json({ ok: false, error: "signature" }, 400);
  }
  const event = JSON.parse(raw);
  if (event.type !== "checkout.session.completed") return json({ ok: true, ignored: event.type });

  const s = event.data.object;
  const offer = offerFor(s);
  if (!offer) return json({ ok: true, ignored: "other_product" });

  const email = String(s.customer_details?.email ?? s.customer_email ?? "").toLowerCase().slice(0, 254);
  const name = s.customer_details?.name ? String(s.customer_details.name).slice(0, 120) : null;
  const phone = s.customer_details?.phone ? String(s.customer_details.phone).slice(0, 40) : null;
  const businessField = (s.custom_fields ?? []).find((f: { key: string }) => f.key === "business_name");
  const business = businessField?.text?.value ? String(businessField.text.value).slice(0, 160) : null;
  const amount = typeof s.amount_total === "number" ? s.amount_total : null;
  const payload = {
    offer: offer.name,
    offer_sku: offer.sku,
    offer_tier: offer.tier,
    stripe_event_id: event.id,
    stripe_session_id: s.id,
    payment_link: s.payment_link ?? null,
    payment_intent: s.payment_intent ?? null,
    customer: s.customer ?? null,
    invoice: s.invoice ?? null,
    amount_total: amount,
    currency: s.currency ?? null,
    payment_status: s.payment_status ?? null,
    phone,
    livemode: event.livemode,
    product: offer.sku,
    thank_you_email: null,
  };

  const inserted = await sql`
    insert into aiphonecompare.leads (email, name, business, industry, source, stage, payload)
    values (${email || "unknown@invalid.example"}, ${name}, ${business}, ${null}, 'stripe', 'active_client', ${sql.json(payload)})
    on conflict ((payload->>'stripe_session_id')) where source = 'stripe' do nothing
    returning id`;
  if (!inserted.length) return json({ ok: true, duplicate: true });
  const leadId = inserted[0].id as string;

  let sent: { ok: boolean; id?: string; error?: string } = { ok: false, error: "no email on session" };
  if (email) {
    const paid = amount != null ? `$${(amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "your payment";
    const first = name ? name.split(" ")[0] : "";
    sent = await sendEmail(offer.sku === "done-for-you-setup"
      ? dfyEmail(email, first, paid, offer.tier)
      : spotlightEmail(email, first, paid));
  }
  await sql`update aiphonecompare.leads set payload = payload || ${sql.json({ thank_you_email: { ...sent, at: new Date().toISOString() } })} where id = ${leadId}`;

  await sendEmail({
    to: "timothy@aiphonecompare.com",
    subject: `PAYMENT: ${offer.name} ${amount != null ? `$${(amount / 100).toFixed(2)}` : ""} from ${email || "unknown"}`,
    html: shell(`<p>Stripe payment logged as lead ${esc(leadId)} (active_client).</p><p><strong>${esc(offer.name)}</strong> (${esc(offer.tier)})</p><p>${esc(email)}${name ? ` · ${esc(name)}` : ""}${business ? ` · ${esc(business)}` : ""}${phone ? ` · ${esc(phone)}` : ""}</p><p>Session ${esc(s.id)}${event.livemode ? "" : " (TEST MODE)"}</p><p>Customer email: ${sent.ok ? "sent" : "FAILED " + esc(sent.error)}</p>`),
    text: `Stripe payment logged as lead ${leadId}. ${offer.name} (${offer.tier}). ${email}. Session ${s.id}. Customer email ${sent.ok ? "sent" : "FAILED"}.`,
    tags: [{ name: "type", value: "internal" }],
  }).catch(() => null);

  return json({ ok: true, lead: leadId });
});
