// POST /functions/v1/apc-stripe-webhook
// Stripe webhook for the $49 Industry spotlight Payment Link. Verifies the
// Stripe signature, logs the payment to aiphonecompare.leads
// (stage active_client, source stripe, idempotent per checkout session), and
// sends a thank-you email with next steps.
import { button, esc, json, secret, sendEmail, shell, sql } from "../_shared/common.ts";

const SPOTLIGHT_LINK = "plink_1UYUSEDIQTTGLh9lp7mhODhB";
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
  const isSpotlight = s.payment_link === SPOTLIGHT_LINK || s.metadata?.sku === "industry-spotlight-30d";
  if (!isSpotlight) return json({ ok: true, ignored: "other_product" });

  const email = String(s.customer_details?.email ?? s.customer_email ?? "").toLowerCase().slice(0, 254);
  const name = s.customer_details?.name ? String(s.customer_details.name).slice(0, 120) : null;
  const amount = typeof s.amount_total === "number" ? s.amount_total : null;
  const payload = {
    stripe_event_id: event.id,
    stripe_session_id: s.id,
    payment_link: s.payment_link ?? null,
    payment_intent: s.payment_intent ?? null,
    customer: s.customer ?? null,
    invoice: s.invoice ?? null,
    amount_total: amount,
    currency: s.currency ?? null,
    payment_status: s.payment_status ?? null,
    livemode: event.livemode,
    product: "industry-spotlight-30d",
    thank_you_email: null as unknown,
  };

  const inserted = await sql`
    insert into aiphonecompare.leads (email, name, business, industry, source, stage, payload)
    values (${email || "unknown@invalid.example"}, ${name}, ${null}, ${null}, 'stripe', 'active_client', ${sql.json(payload)})
    on conflict ((payload->>'stripe_session_id')) where source = 'stripe' do nothing
    returning id`;
  if (!inserted.length) return json({ ok: true, duplicate: true });
  const leadId = inserted[0].id as string;

  let sent: { ok: boolean; id?: string; error?: string } = { ok: false, error: "no email on session" };
  if (email) {
    const paid = amount != null ? `$${(amount / 100).toFixed(2)}` : "your payment";
    const hi = name ? `Hi ${esc(name.split(" ")[0])},` : "Hi there,";
    sent = await sendEmail({
      to: email,
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
<p style="font-size:13px;color:#6b6b66;">Sponsored spots are always labeled. Rankings, listings and verified prices are never for sale, which is what keeps the page worth being seen on.</p>
${button("https://aiphonecompare.com/get-featured/", "View spotlight details")}
<p>Thanks again,<br>Timothy<br><span style="color:#6b6b66;">aiphonecompare.com</span></p>`),
      text: `${name ? `Hi ${name.split(" ")[0]},` : "Hi there,"}\n\nThank you for booking an Industry spotlight on aiphonecompare. We received ${paid}; your receipt comes separately from Stripe.\n\nNext step: reply with (1) your company name and website, (2) the industry page you want (dental, legal, home services or medical), (3) one short line to show plus the link.\n\nYour spotlight runs 30 days at the top of that industry page, labeled Sponsored. We'll confirm the go-live date once it's up, usually within one business day of your reply.\n\nRankings, listings and verified prices are never for sale.\n\nThanks again,\nTimothy\naiphonecompare.com`,
      tags: [{ name: "type", value: "stripe_thanks" }],
    });
  }
  await sql`update aiphonecompare.leads set payload = payload || ${sql.json({ thank_you_email: { ...sent, at: new Date().toISOString() } })} where id = ${leadId}`;

  await sendEmail({
    to: "timothy@aiphonecompare.com",
    subject: `PAYMENT: Industry spotlight ${amount != null ? `$${(amount / 100).toFixed(2)}` : ""} from ${email || "unknown"}`,
    html: shell(`<p>Stripe payment logged as lead ${esc(leadId)} (active_client).</p><p>${esc(email)}${name ? ` · ${esc(name)}` : ""}</p><p>Session ${esc(s.id)}${event.livemode ? "" : " (TEST MODE)"}</p><p>Thank-you email: ${sent.ok ? "sent" : "FAILED " + esc(sent.error)}</p>`),
    text: `Stripe payment logged as lead ${leadId}. ${email}. Session ${s.id}. Thank-you ${sent.ok ? "sent" : "FAILED"}.`,
    tags: [{ name: "type", value: "internal" }],
  }).catch(() => null);

  return json({ ok: true, lead: leadId });
});
