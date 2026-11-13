// Shared helpers for aiphonecompare edge functions.
// Secrets live in Supabase Vault (never in the repo). The function reads them
// over the built-in SUPABASE_DB_URL connection.
import postgres from "npm:postgres@3.4.5";

export const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
  prepare: false,
  max: 2,
  idle_timeout: 20,
});

const secretCache = new Map<string, string>();
export async function secret(name: string): Promise<string> {
  const hit = secretCache.get(name);
  if (hit) return hit;
  const rows = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name} limit 1`;
  const value = rows[0]?.decrypted_secret as string | undefined;
  if (!value) throw new Error(`missing secret ${name}`);
  secretCache.set(name, value);
  return value;
}

export const FROM = "Timothy at aiphonecompare <timothy@aiphonecompare.com>";
export const REPLY_TO = "timothy@aiphonecompare.com";
export const SITE = "https://aiphonecompare.com";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: { name: string; value: string }[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = await secret("apc_resend_api_key");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, ...msg }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `${res.status} ${JSON.stringify(body).slice(0, 300)}` };
  return { ok: true, id: body.id };
}

export function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f4;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1b1b1b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e6e1;border-radius:12px;">
<tr><td style="padding:28px 28px 8px 28px;font-size:13px;letter-spacing:.02em;color:#6b6b66;">aiphonecompare</td></tr>
<tr><td style="padding:0 28px 28px 28px;font-size:15px;line-height:1.6;">${inner}</td></tr>
</table>
<p style="font-size:12px;color:#8a8a84;margin:16px 0 0 0;">aiphonecompare.com · independent AI receptionist price comparison. Reply to this email to unsubscribe.</p>
</td></tr></table></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:22px 0;"><a href="${esc(href)}" style="display:inline-block;background:#1b1b1b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">${esc(label)}</a></p>`;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
