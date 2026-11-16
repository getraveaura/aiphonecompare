// "<Vendor> alternatives" pages and "best under $X" pages. Every figure is
// counted or read from src/data/vendors.json (and its matching
// price-plans.json entry). Nothing is ranked by payment: lists sort by the
// published starting price, ties alphabetical.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate } from './stories.mjs';
import { shortDate } from './plans.mjs';
import { isSponsored } from './spotlight.mjs';
import { outboundLink, REFERRAL_NOTE } from './outbound.mjs';
import { KIND, REASONS, byAmountThenName, latestChecked, money, priceStatus } from './starting-price.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', file), 'utf8'));
const VENDORS = read('vendors.json');
const PLANS = read('price-plans.json');

export const ALTERNATIVES_INDEX = '/alternatives/';
// Order is the order on the /alternatives/ index. Missing slugs are skipped.
export const ALTERNATIVE_TARGETS = ['smith-ai', 'ruby', 'goodcall', 'my-ai-front-desk', 'rosie'];
// "About the same" = the same starting price, or up to this share more.
export const SIMILAR_SHARE = 0.2;

const LIVE_PEOPLE = /live agents|live receptionists|human-first|\bAI, human\b|\bhybrid\b/i;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const isAre = (n) => (n === 1 ? 'is' : 'are');

export function alternativesPath(slug) {
  return `${ALTERNATIVES_INDEX}${slug}/`;
}

export function alternativesTargets(list = VENDORS) {
  return ALTERNATIVE_TARGETS.filter((slug) => list.some((v) => v.slug === slug));
}

export function hasAlternativesPage(slug, list = VENDORS) {
  return alternativesTargets(list).includes(slug);
}

function row(vendor, plans) {
  return { vendor, status: priceStatus(vendor, plans), sponsored: isSponsored(vendor) };
}

function hasLivePeople(vendor) {
  return LIVE_PEOPLE.test(vendor.human_handoff || '');
}

function sharedIndustries(a, b) {
  const set = new Set(a.industries || []);
  return (b.industries || []).filter((id) => set.has(id));
}

// ---------- Alternatives ----------

export function buildAlternatives(slug, list = VENDORS, plans = PLANS) {
  const target = list.find((v) => v.slug === slug);
  if (!target || !hasAlternativesPage(slug, list)) return null;
  const self = row(target, plans);
  const base = self.status.counted ? self.status.amount : null;
  const pool = list
    .filter((v) => v.slug !== slug && sharedIndustries(target, v).length > 0)
    .map((v) => row(v, plans));
  const taken = new Set();
  const take = (rows) => {
    const out = rows.filter((r) => !taken.has(r.vendor.slug)).sort(byAmountThenName);
    out.forEach((r) => taken.add(r.vendor.slug));
    return out;
  };
  const counted = pool.filter((r) => r.status.counted);
  const groups = [];
  const push = (id, title, intro, rows, compact = false) => {
    if (rows.length) groups.push({ id, title, intro, rows, compact });
  };

  // Like-for-like first: a human answering service is compared with others that also have live people.
  if (hasLivePeople(target)) {
    push('live-people', 'Also offer live people on the phone',
      `Like ${target.name}, these list live agents or receptionists in their handoff details.`,
      take(pool.filter((r) => hasLivePeople(r.vendor))));
  }
  if (!String(target.human_handoff || '').trim()) {
    push('adds-handoff', 'Describe a handoff to a person',
      `${target.name}'s record does not describe a human handoff. These listings do.`,
      take(pool.filter((r) => String(r.vendor.human_handoff || '').trim())));
  }
  if (base != null) {
    push('cheaper', `Lower starting price than ${target.name}`,
      `Their published starting plan is under ${money(base)}/mo. Check what each plan includes before you compare.`,
      take(counted.filter((r) => r.status.amount < base)));
    push('similar', 'About the same starting price',
      `From ${money(base)}/mo up to ${Math.round(SIMILAR_SHARE * 100)}% more.`,
      take(counted.filter((r) => r.status.amount >= base && r.status.amount <= base * (1 + SIMILAR_SHARE))));
    push('higher', 'Higher starting price',
      'These start higher. The plan text shows what each one includes.',
      take(counted.filter((r) => r.status.amount > base * (1 + SIMILAR_SHARE))), true);
  } else {
    push('published', 'Published starting price', 'Sorted by published starting price, lowest first.', take(counted), true);
  }
  push('addons', 'Add-ons for other business software',
    'Built into software you may already use. The price is for the add-on only.',
    take(pool.filter((r) => r.status.kind === KIND.addon)), true);
  push('priced-differently', 'Priced another way',
    'These publish a price, but not as one monthly plan you can compare directly.',
    take(pool.filter((r) => [KIND.perSeat, KIND.aiNotPublished, KIND.noMonthly].includes(r.status.kind))), true);
  push('not-published', 'Price not published on their own site',
    'Ask these companies for a quote. We do not fill in a price they have not published.',
    take(pool.filter((r) => r.status.kind === KIND.notPublished)), true);

  const all = groups.flatMap((g) => g.rows);
  const cheaper = groups.find((g) => g.id === 'cheaper')?.rows || [];
  const live = groups.find((g) => g.id === 'live-people')?.rows || [];
  const unpublished = groups.find((g) => g.id === 'not-published')?.rows || [];
  const lowest = all.filter((r) => r.status.counted).sort(byAmountThenName)[0] || null;
  const latest = latestChecked([target, ...all.map((r) => r.vendor)]);
  const shared = [...new Set(all.flatMap((r) => sharedIndustries(target, r.vendor)))];

  const summary = [];
  if (base != null) {
    summary.push(`${target.name}'s published starting price is ${money(base)}/mo, checked ${formatDate(target.last_checked)}.`);
    summary.push(`${cheaper.length} of ${all.length} alternatives listed here publish a lower starting price on their own site.`);
  } else {
    summary.push(`${target.name} does not publish a starting price on its own site.`);
  }
  if (lowest) summary.push(`The lowest monthly amount written in these listings is ${lowest.status.display}, for ${lowest.vendor.name}.`);
  if (live.length) summary.push(`${live.length} of ${all.length} also offer live people on the phone, like ${target.name}.`);
  if (unpublished.length) summary.push(`${unpublished.length} of ${all.length} do not publish a price on their own site.`);

  const faqs = [
    {
      q: `What is the cheapest alternative to ${target.name}?`,
      a: lowest
        ? `Of the alternatives listed here, ${lowest.vendor.name} publishes the lowest starting plan: ${lowest.status.display}, checked ${formatDate(lowest.vendor.last_checked)}. A lower starting price can include fewer minutes or calls, so compare what each plan includes at your own call volume.`
        : 'None of the alternatives listed here publishes a monthly starting price on its own site.',
    },
    ...(live.length ? [{
      q: `Which ${target.name} alternatives also have live receptionists?`,
      a: `${live.map((r) => r.vendor.name).join(', ')}. Each record says live agents or receptionists can take calls. Check hours and per-minute costs on the vendor's own page.`,
    }] : []),
    {
      q: 'How did you pick these alternatives?',
      a: `Every vendor in our directory that is listed for at least one of the same industries as ${target.name}. Nobody paid to be on this page, and the order is by published starting price, lowest first.`,
    },
    {
      q: 'Why does a company show "Not published"?',
      a: 'We only show a starting price that the company prints on its own website. If the only figure we have comes from another site, or there is no price at all, the card says Not published.',
    },
    {
      q: 'Are sponsored companies ranked higher?',
      a: 'No. A sponsored listing is labeled, and payment never changes its place in a list or its price.',
    },
  ];

  const referral = all.some((r) => outboundLink(r.vendor)?.isReferral) || outboundLink(target)?.isReferral;
  const name = target.name;
  return {
    slug,
    path: alternativesPath(slug),
    target: self,
    base,
    groups,
    rows: all,
    count: all.length,
    cheaperCount: cheaper.length,
    livePeopleCount: live.length,
    unpublishedCount: unpublished.length,
    lowest,
    latest,
    sharedIndustries: shared,
    h1: `${name} alternatives (checked ${shortDate(latest)})`,
    title: `${name} alternatives: ${all.length} AI receptionists compared${latest ? ` (${latest.slice(0, 4)})` : ''}`,
    description: base != null
      ? `${name} alternatives with published prices: ${cheaper.length} of ${all.length} start below ${name}'s ${money(base)}/mo. Billing, free trial, human handoff and HIPAA for each, with sources and dates. Rankings not for sale.`
      : `${name} alternatives with published prices, billing, free trial, human handoff and HIPAA for each, with sources and dates. Rankings not for sale.`,
    summary,
    faqs,
    referralNote: referral ? REFERRAL_NOTE : '',
  };
}

export function getAlternatives(list = VENDORS, plans = PLANS) {
  return alternativesTargets(list).map((slug) => buildAlternatives(slug, list, plans));
}

// ---------- Best under $X ----------

export const BUDGETS = [50, 100, 200];
export const budgetPath = (amount) => `/best/under-${amount}/`;

export function buildBudget(amount, list = VENDORS, plans = PLANS) {
  if (!BUDGETS.includes(amount)) return null;
  const rows = list.map((v) => row(v, plans));
  const within = (r) => r.status.amount != null && r.status.amount <= amount;
  const listed = rows.filter((r) => r.status.counted && within(r)).sort(byAmountThenName);
  const addons = rows.filter((r) => r.status.kind === KIND.addon && within(r)).sort(byAmountThenName);
  const notCounted = rows
    .filter((r) => [KIND.perSeat, KIND.aiNotPublished, KIND.noMonthly, KIND.notPublished].includes(r.status.kind) && within(r))
    .sort((a, b) => a.vendor.name.localeCompare(b.vendor.name));
  const noPrice = rows.filter((r) => r.status.kind === KIND.notPublished && r.status.amount == null).length;
  const lowest = listed[0] || null;
  const latest = latestChecked(listed.map((r) => r.vendor));
  const cap = `${money(amount)}/mo`;
  const summary = [
    `${listed.length} AI receptionists publish a starting plan at or under ${cap} on their own website.`,
    ...(lowest ? [`The lowest monthly amount written in these listings is ${lowest.status.display}, for ${lowest.vendor.name}.`] : []),
    ...(addons.length ? [`${plural(addons.length, 'more add-on')} at or under ${cap} ${addons.length === 1 ? 'needs' : 'need'} another paid plan from the same company.`] : []),
  ];
  const faqs = [
    {
      q: `What is the cheapest AI receptionist under ${money(amount)} a month?`,
      a: lowest
        ? `${lowest.vendor.name} publishes the lowest starting plan on this list: ${lowest.status.display}, checked ${formatDate(lowest.vendor.last_checked)}. The cheapest plan is not always the cheapest bill: check how many minutes or calls it includes and what extra use costs.`
        : `No AI receptionist in our directory publishes a starting plan at or under ${cap} on its own website.`,
    },
    {
      q: 'What counts as the starting price?',
      a: 'The lowest paid monthly plan the company prints on its own website, as we read it on the date shown. Plans billed yearly count at the monthly figure the company prints. Free plans and pay-as-you-go plans with no monthly fee are not counted as a starting price.',
    },
    {
      q: 'Do per-minute or per-call plans count?',
      a: `Only when the plan states a monthly fee at or under ${cap}, such as a plan with included minutes and a per-minute charge after that. A plan priced only per minute or per call has no monthly fee to compare, so it is left out.`,
    },
    {
      q: 'Why is a company I know missing?',
      a: 'It may price per user or seat, be an add-on to other software, publish no price on its own site, or start above this budget. Companies that would fit on price but do not count are listed with the reason.',
    },
    {
      q: 'Is this list ranked or paid?',
      a: 'No. It is sorted by published starting price, lowest first, with ties in alphabetical order. A sponsored listing is labeled and keeps its place.',
    },
  ];
  const others = BUDGETS.filter((b) => b !== amount).map((b) => ({ href: budgetPath(b), label: `Under ${money(b)}/mo` }));
  const referral = [...listed, ...addons].some((r) => outboundLink(r.vendor)?.isReferral);
  return {
    amount,
    path: budgetPath(amount),
    cap,
    listed,
    addons,
    notCounted,
    noPrice,
    lowest,
    latest,
    count: listed.length,
    h1: `Best AI receptionist under ${money(amount)} a month`,
    title: `AI receptionists under ${cap}: ${listed.length} with published prices${latest ? ` (${latest.slice(0, 4)})` : ''}`,
    description: `${listed.length} AI receptionists whose own website lists a starting plan at or under ${cap}, sorted by price${lowest ? `, from ${lowest.status.display}` : ''}. Sources and check dates on every listing. Rankings not for sale.`,
    summary,
    faqs,
    others,
    rule: [
      `Counts: the lowest paid monthly plan printed on the company’s own website, at or under ${cap}, as checked on the date shown.`,
      'Counts: plans with included minutes or calls and a per-minute or per-call charge after that, when the monthly fee is at or under the budget.',
      'Does not count: a price we only found on another website, per-user or per-seat pricing, and add-ons that need another paid plan (add-ons are shown separately).',
      'Does not count: free or pay-as-you-go plans with no monthly fee. They are mentioned in the plan text where a company offers one.',
    ],
    referralNote: referral ? REFERRAL_NOTE : '',
  };
}

export function getBudgets(list = VENDORS, plans = PLANS) {
  return BUDGETS.map((amount) => buildBudget(amount, list, plans));
}

export { REASONS };
