// Buyer-intent industry guides. Prices and tables are copied from the directory
// and the existing industry cost pages. This file does not invent a ranking or
// a typical call volume.
import { AUDIT_PATH } from './audit.mjs';
import { dfyIndustryPath } from './dfy-industries.mjs';
import { formatDate, industryLabel } from './stories.mjs';
import { getLandings } from './landings.mjs';
import { outboundLink, REFERRAL_NOTE } from './outbound.mjs';
import { lowestMonthly, lowestMonthlyListing } from './price.mjs';
import { orderForIndustry } from './spotlight.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const vendors = JSON.parse(fs.readFileSync(path.join(root, 'src/data/vendors.json'), 'utf8'));

function money(n) {
  return Number.isInteger(n) ? `$${n}` : `$${n}`;
}

function costPage(costPath) {
  return getLandings().find((page) => page.path === costPath) || null;
}

function priceSentence(list) {
  const low = lowestMonthlyListing(list);
  const lowAmount = low ? lowestMonthly(low.starting_price) : null;
  const lowChecked = low?.last_checked ? formatDate(low.last_checked) : '';
  if (lowAmount == null) return 'None of these listings has a monthly dollar amount in the starting price.';
  return `The lowest monthly amount written in these listings is ${money(lowAmount)}/mo, for ${low.name}${lowChecked ? `, checked ${lowChecked}` : ''}.`;
}

const GUIDES = [
  {
    slug: 'dentists',
    path: '/best/dentists/',
    industryKey: 'dental',
    dfySlug: 'dental',
    costPath: '/cost/dental/',
    industryPath: '/industries/dental/',
    accent: 'dental',
    phrase: 'best AI receptionist for dentists',
    h1: 'Best AI receptionist for dentists',
    kicker: 'Dental practices',
    description: 'Best AI receptionist for dentists: sourced starting prices, what to test before you buy, and no paid rankings. Open the dental cost page, the calculator, the free call coverage check, or done-for-you setup.',
    lede: 'This page is for dental practices comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'The table is the dental directory on this site. Every starting price is the text recorded from the vendor page or cited source, with the date it was checked.',
    checks: [
      { h: 'Booking write-back', p: 'Ask whether it books straight into your practice management system (Dentrix, Eaglesoft, Open Dental, Curve, Denticon) or only takes a message.' },
      { h: 'BAA in writing', p: 'A vendor that hears patient details is a HIPAA business associate. A "HIPAA compliant" badge is not a signed Business Associate Agreement.' },
      { h: 'Emergency handoff', p: 'Place an after-hours urgent call and see whether a person gets it, with the context your team needs.' },
      { h: 'Recording notice', p: 'If the tool records or transcribes, match the announcement to the caller\'s state on the call recording consent page.' },
    ],
    faqs: [
      { q: 'Which AI receptionist is best for a dental office?', a: 'This site does not pick a winner. Use the checks on this page, compare the sourced starting prices, and run your own call volume on the dental cost page and the calculator where a vendor publishes enough to estimate a bill.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing is labeled and can appear first only on the one industry page it paid for. Payment does not change a price or the order of the other rows.' },
      { q: 'What should a dental office test before buying?', a: 'Ask for a booking that writes into the practice management system, not only a message. Ask for the signed BAA, not only a HIPAA badge. Place an after-hours urgent call and see whether a person gets it.' },
    ],
  },
  {
    slug: 'law-firms',
    path: '/best/law-firms/',
    industryKey: 'legal',
    dfySlug: 'legal',
    costPath: '/cost/legal/',
    industryPath: '/industries/legal/',
    accent: 'legal',
    phrase: 'best AI receptionist for law firms',
    h1: 'Best AI receptionist for law firms',
    kicker: 'Law firms',
    description: 'Best AI receptionist for law firms: sourced starting prices, intake and escalation checks, and no paid rankings. Open the legal cost page, the calculator, the free call coverage check, or done-for-you setup.',
    lede: 'This page is for law firms comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'The table is the legal directory on this site. Every starting price is the text recorded from the vendor page or cited source, with the date it was checked.',
    checks: [
      { h: 'Intake screening', p: 'Run your practice-area screening questions and try to book a consultation in the demo.' },
      { h: 'Practice management sync', p: 'Check whether Clio, MyCase, or Lawmatics is a native integration or only a Zapier connection.' },
      { h: 'Human escalation', p: 'Decide which calls must reach a person, and test that the transfer arrives with the context your team needs.' },
      { h: 'Recording notice', p: 'Confirm how the product announces recording before you rely on it. The statute list is on the call recording consent page. It is not legal advice.' },
    ],
    faqs: [
      { q: 'Which AI receptionist is best for a law firm?', a: 'This site does not pick a winner. Use the checks on this page, compare the sourced starting prices, and run your own call volume on the legal cost page and the calculator where a vendor publishes enough to estimate a bill.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing is labeled and can appear first only on the one industry page it paid for. Payment does not change a price or the order of the other rows.' },
      { q: 'What should a law firm test in a demo?', a: 'Run the practice-area screening questions and try to book a consultation. Check whether Clio, MyCase, or Lawmatics is a native integration or only a Zapier connection. Decide which calls must reach a person.' },
    ],
  },
  {
    slug: 'med-spas',
    path: '/best/med-spas/',
    industryKey: 'medical',
    dfySlug: 'med-spa',
    costPath: '/cost/medical/',
    industryPath: '/industries/medical/',
    accent: 'med-spa',
    phrase: 'best AI receptionist for med spas',
    h1: 'Best AI receptionist for med spas',
    kicker: 'Med spas',
    description: 'Best AI receptionist for med spas: sourced medical-directory starting prices, what to test before you buy, and no paid rankings. This site has no separate med-spa vendor list.',
    lede: 'This page is for med spas comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'This site does not keep a separate med-spa vendor directory. The table below is the medical-practice directory, which is the closest sourced set we have. A starting price here is still the text recorded from the vendor page or cited source, with the date it was checked.',
    checks: [
      { h: 'Scheduling', p: 'Book, reschedule, and cancel against your real visit lengths and which providers can be booked.' },
      { h: 'Clinical boundary', p: 'Ask for medical advice, a diagnosis, or a treatment instruction. The agent should refuse and route the call.' },
      { h: 'Urgent and after-hours', p: 'Place a call that should reach a person, and see whether the transfer arrives with a summary.' },
      { h: 'Health information', p: 'If you handle protected health information, confirm a signed Business Associate Agreement before any of those details are spoken. A HIPAA badge is not a signed agreement. The table quotes what each vendor publishes.' },
      { h: 'Recording notice', p: 'Many of these tools record or transcribe. Match the announcement to the caller\'s state on the call recording consent page.' },
    ],
    faqs: [
      { q: 'Do you have a med-spa-only vendor list?', a: 'No. This site does not keep a separate med-spa directory. The table on this page is the medical-practice directory, which is the closest sourced set we have.' },
      { q: 'Which AI receptionist is best for a med spa?', a: 'This site does not pick a winner. Use the checks on this page, compare the sourced starting prices, and run your own call volume on the medical cost page and the calculator where a vendor publishes enough to estimate a bill.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing is labeled and can appear first only on the one industry page it paid for. Payment does not change a price or the order of the other rows.' },
    ],
  },
  {
    slug: 'hvac-plumbing',
    path: '/best/hvac-plumbing/',
    industryKey: 'plumbing',
    dfySlug: 'home-services',
    costPath: '/cost/home-services/',
    extraCostPath: '/cost/hvac-shop/',
    industryPath: '/industries/plumbing/',
    accent: 'hvac',
    phrase: 'best AI receptionist for HVAC and plumbing',
    h1: 'Best AI receptionist for HVAC and plumbing',
    kicker: 'Home services',
    description: 'Best AI receptionist for HVAC and plumbing: sourced starting prices, dispatch and emergency-routing checks, and no paid rankings. Open the home-services and 3-tech HVAC cost pages, the calculator, or done-for-you setup.',
    lede: 'This page is for HVAC, plumbing, and other home-service shops comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'Home services listings on this site, including HVAC, are filed under plumbing. The table is that directory. Every starting price is the text recorded from the vendor page or cited source, with the date it was checked.',
    checks: [
      { h: 'Emergency routing', p: 'Ask for a demo of an emergency call, such as a no-heat or burst-pipe call, reaching your on-call technician after hours.' },
      { h: 'Dispatch software', p: 'Check native ServiceTitan, Jobber, or Housecall Pro support. Some of those platforms also sell a built-in receptionist.' },
      { h: 'Billing model', p: 'Per-minute, per-call, and flat-rate plans cost very differently in a busy week. Compare them against your own call count on the cost pages, not against a typical shop size we do not publish.' },
      { h: 'Recording notice', p: 'If calls are recorded, check the caller\'s state on the call recording consent page.' },
    ],
    faqs: [
      { q: 'Which AI receptionist is best for an HVAC or plumbing shop?', a: 'This site does not pick a winner. Use the checks on this page, compare the sourced starting prices, and run your own call volume on the home-services cost page, the 3-tech HVAC shop cost page, and the calculator where a vendor publishes enough to estimate a bill.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing is labeled and can appear first only on the one industry page it paid for. Payment does not change a price or the order of the other rows.' },
      { q: 'What should a plumbing or HVAC company test in a demo?', a: 'Place an emergency call and see whether it reaches the on-call technician. Check ServiceTitan, Jobber, or Housecall Pro support on the vendor page. Compare per-minute, per-call, and flat prices against a busy week of your own calls. The cost pages do that math only where the vendor publishes allowances and overage.' },
    ],
  },
];

export function buildBestGuides(list = vendors) {
  return GUIDES.map((guide) => buildGuide(guide, list));
}

export function getBestGuides(list = vendors) {
  return buildBestGuides(list);
}

export function bestGuide(slug, list = vendors) {
  const guide = GUIDES.find((item) => item.slug === slug);
  return guide ? buildGuide(guide, list) : null;
}

export function bestGuideSlugs() {
  return GUIDES.map((guide) => guide.slug);
}

export function bestPathForIndustry(key) {
  const guide = GUIDES.find((item) => item.industryKey === key);
  return guide ? { href: guide.path, label: guide.h1 } : null;
}

function buildGuide(guide, list) {
  const ordered = orderForIndustry(list, guide.industryKey);
  const cost = costPage(guide.costPath);
  const extraCost = guide.extraCostPath ? costPage(guide.extraCostPath) : null;
  const latest = ordered.map((vendor) => vendor.last_checked).filter(Boolean).sort().at(-1) || '';
  const sentence = priceSentence(ordered);
  const range = cost?.summary?.[0] || '';
  const referrals = ordered.filter((vendor) => outboundLink(vendor)?.isReferral);
  const visits = Object.fromEntries(
    ordered
      .map((vendor) => {
        const outbound = outboundLink(vendor);
        return outbound ? [vendor.slug, { ...outbound, name: vendor.name, slug: vendor.slug }] : null;
      })
      .filter(Boolean),
  );
  const summary = [
    `${ordered.length} vendors are in the ${industryLabel(guide.industryKey).toLowerCase()} directory used on this page. ${sentence}`,
    guide.lede,
    range || 'Monthly scenarios at 50, 150, and 300 calls are on the matching cost page, only where a vendor publishes enough to estimate a bill.',
  ];
  const related = [
    { href: guide.industryPath, label: `${industryLabel(guide.industryKey)} directory` },
    { href: guide.costPath, label: cost?.h1 || 'Industry cost page' },
    ...(extraCost ? [{ href: extraCost.path, label: extraCost.h1 }] : []),
    { href: `/cost/calculator/?industry=${guide.industryKey}&calls=150&minutes=3`, label: 'Cost calculator' },
    { href: dfyIndustryPath(guide.dfySlug), label: 'Done-for-you setup for this industry' },
    { href: AUDIT_PATH, label: 'Free call coverage check' },
    { href: '/best/', label: 'All industry guides' },
  ];
  const dollars = [
    sentence,
    ...ordered.map((vendor) => vendor.starting_price || ''),
    cost?.dollars || '',
    extraCost?.dollars || '',
    summary.join(' '),
    guide.faqs.map((item) => item.a).join(' '),
  ].join(' ');
  return {
    ...guide,
    vendors: ordered,
    referrals,
    visits,
    referralNote: referrals.length ? REFERRAL_NOTE : '',
    summary,
    verified: latest,
    date: latest,
    title: `${guide.h1}: sourced prices, no paid ranking${latest ? ` (${latest.slice(0, 4)})` : ''}`,
    related,
    dollars,
    count: ordered.length,
    dfyPath: dfyIndustryPath(guide.dfySlug),
    calculatorPath: `/cost/calculator/?industry=${guide.industryKey}&calls=150&minutes=3`,
    auditPath: AUDIT_PATH,
  };
}
