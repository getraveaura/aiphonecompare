// Structured view of a vendor's published starting_price text.
// The text in vendors.json stays the record. A structured entry is only used
// while its `basis` still equals that text word for word, so a price change
// can never show stale plans.

const MONEY = /^(~?(?:US)?\$[\d,]+(?:\.\d+)?)(.*)$/;

export function splitMoney(text) {
  const m = MONEY.exec(String(text || '').trim());
  if (!m) return { amount: '', unit: '', text: String(text || '') };
  return { amount: m[1], unit: m[2].trim(), text: String(text) };
}

export function planEntry(vendor, data) {
  const entry = data?.vendors?.[vendor?.slug];
  if (!entry) return null;
  if (entry.basis !== (vendor.starting_price || '')) return null;
  return entry;
}

// Fallback: the original text, split only at semicolons and sentence ends.
// Nothing is reworded, dropped or added.
export function textLines(text) {
  return String(text || '')
    .split(/;\s+|(?<=\.)\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function priceView(vendor, data) {
  const text = (vendor?.starting_price || '').trim();
  if (!text) return { kind: 'empty' };
  const entry = planEntry(vendor, data);
  if (!entry) return { kind: 'text', lines: textLines(text) };
  const headline = entry.headline
    ? { prefix: '', ...splitMoney(''), text: entry.headline }
    : { prefix: 'From', ...splitMoney(entry.from) };
  return {
    kind: 'plans',
    headline,
    plans: (entry.plans || []).map((plan) => ({
      label: plan.name || plan.includes || '',
      sub: plan.name ? plan.includes || '' : '',
      price: plan.price,
      extra: plan.extra || '',
    })),
    oneTime: entry.one_time || [],
    note: entry.note || '',
  };
}

// Every number in the structured entry must appear in the source text.
const NUM = /\d[\d,]*(?:\.\d+)?/g;
const norm = (n) => n.replace(/,/g, '').replace(/\.0+$/, '');
export function numbersIn(text) {
  return new Set([...String(text || '').matchAll(NUM)].map((m) => norm(m[0])));
}
export function entryText(entry) {
  const parts = [entry.from, entry.headline, entry.note];
  for (const p of entry.plans || []) parts.push(p.name, p.price, p.includes, p.extra);
  for (const o of entry.one_time || []) parts.push(o.label, o.price);
  return parts.filter(Boolean).join(' | ');
}
export function unsupportedNumbers(entry) {
  const allowed = numbersIn(entry.basis);
  return [...numbersIn(entryText(entry))].filter((n) => !allowed.has(n));
}

export function shortDate(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
