// Buyer-intent industry guides. Prices and tables are copied from the directory
// and the existing industry cost pages. This file does not invent a ranking or
// a typical call volume.
import { AUDIT_PATH } from './audit.mjs';
import { dfyIndustryPath } from './dfy-industries.mjs';
import { DFY_PATH } from './offers.mjs';
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
  {
    slug: 'veterinarians',
    path: '/best/veterinarians/',
    vendorSlugs: ['weave'],
    accent: 'veterinary',
    phrase: 'best AI receptionist for veterinarians',
    h1: 'Best AI receptionist for veterinarians',
    kicker: 'Veterinary practices',
    description: 'Best AI receptionist for veterinarians: the one sourced listing that mentions veterinary practices, with no paid ranking and no invented vet directory.',
    lede: 'This page is for veterinary practices comparing AI receptionists. It is not a ranked list. Payment does not change a price.',
    scope: 'This site does not keep a veterinary vendor directory. The table lists the one vendor whose sourced record mentions veterinary practices: Weave. Its questions page says it is built for dental, medical, veterinary, optical, and specialty healthcare, and its integrations line names practice systems across dental, medical, optometry, and veterinary. Automatic booking is described for qualified dental PMS only. The recorded starting price is the base plan, from $199/mo; the AI Receptionist line is labeled early access and has no published price of its own.',
    subsetNote: 'This site does not keep a separate veterinary vendor directory. The table lists the one vendor whose sourced record mentions veterinary practices.',
    checks: [
      { h: 'Who the listing actually names', p: 'Confirm with the vendor that veterinary workflows are supported, not only mentioned on a marketing page. This directory has no second veterinary listing to compare against.' },
      { h: 'Booking write-back', p: "Weave's record describes automatic booking for qualified dental practice systems only. Ask whether your veterinary practice software is included before you assume a booking will land in the schedule." },
      { h: 'Health information', p: 'If you handle protected health information, confirm a signed Business Associate Agreement before those details are spoken. Weave publishes a BAA naming Weave Communications, Inc. A HIPAA badge is not a signed agreement.' },
      { h: 'Recording notice', p: "If the tool records or transcribes, match the announcement to the caller's state on the call recording consent page." },
    ],
    faqs: [
      { q: 'Do you have a veterinary vendor directory?', a: 'No. This site does not keep a separate veterinary directory. The table on this page is the one vendor whose sourced record mentions veterinary practices: Weave.' },
      { q: 'Which AI receptionist is best for a veterinary clinic?', a: 'This site does not pick a winner. Only one listing in the directory mentions veterinary practices. Read that record, including that the $199/mo figure is the base plan and the AI Receptionist price is not published, then run your own call volume on the calculator.' },
      { q: 'Are these tools ranked?', a: 'No. There is only one sourced listing on this page. A sponsored listing, if one appears, is labeled. Payment does not change a price.' },
    ],
  },
  {
    slug: 'roofing',
    path: '/best/roofing/',
    industryKey: 'plumbing',
    dfySlug: 'home-services',
    costPath: '/cost/home-services/',
    industryPath: '/industries/plumbing/',
    accent: 'roofing',
    phrase: 'best AI receptionist for roofing companies',
    h1: 'Best AI receptionist for roofing companies',
    kicker: 'Roofing companies',
    description: 'Best AI receptionist for roofing companies: sourced home-services starting prices, no paid ranking, and no separate roofing vendor list. Open the cost page, calculator, free check, or done-for-you setup.',
    lede: 'This page is for roofing companies comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'This site does not keep a separate roofing vendor directory. Home services listings, including HVAC and roofing tools filed there, are kept under plumbing. The table is that directory. Every starting price is the text recorded from the vendor page or cited source, with the date it was checked. Sourced roofing stories are linked below; they do not add vendors to this table.',
    checks: [
      { h: 'After-hours and overflow', p: 'Place an after-hours or overflow call in a demo and see whether it books a visit, takes a message, or reaches the person on call.' },
      { h: 'Dispatch software', p: 'Check native ServiceTitan, Jobber, or Housecall Pro support. Some of those platforms also sell a built-in receptionist. A starting price for the add-on is not a price for the rest of the platform.' },
      { h: 'Billing model', p: 'Per-minute, per-call, and flat-rate plans cost very differently in a storm week. Compare them against your own call count on the cost page, not against a typical roofing volume we do not publish.' },
      { h: 'Recording notice', p: "If calls are recorded, check the caller's state on the call recording consent page." },
    ],
    storyLinks: [
      { href: '/stories/truchoice-roofing-after-hours-ai/', label: 'TruChoice Roofing: 26 appointments from unanswered calls' },
      { href: '/stories/red-dogs-roofing-stopped-ai/', label: "Red Dog's Roofing asked to turn the AI off" },
      { href: '/cost/missed-call/', label: 'Cost of a missed call, from sourced stories' },
    ],
    faqs: [
      { q: 'Do you have a roofing-only vendor list?', a: 'No. This site does not keep a separate roofing directory. Home services listings, including roofing tools filed there, are kept under plumbing. The table on this page is that directory.' },
      { q: 'Which AI receptionist is best for a roofing company?', a: 'This site does not pick a winner. Use the checks on this page, compare the sourced starting prices, and run your own call volume on the home-services cost page and the calculator where a vendor publishes enough to estimate a bill.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing is labeled and can appear first only on the one industry page it paid for. Payment does not change a price or the order of the other rows.' },
    ],
  },
  {
    slug: 'chiropractors',
    path: '/best/chiropractors/',
    vendorSlugs: ['agentzap', 'dialzara', 'my-ai-front-desk', 'rosie', 'smith-ai', 'upfirst'],
    accent: 'chiro',
    phrase: 'best AI receptionist for chiropractors',
    h1: 'Best AI receptionist for chiropractors',
    kicker: 'Chiropractic offices',
    description: 'Best AI receptionist for chiropractors: sourced starting prices from vendors with their own chiropractic pages, and no paid ranking. Open the calculator, the free call coverage check, or done-for-you setup.',
    lede: 'This page is for chiropractic offices comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'This site does not keep a separate chiropractic vendor directory. The table lists vendors whose own pages name chiropractic practices. Every starting price is the text recorded from the vendor pricing page, with the date it was checked. The medical-practice directory and the therapy listing are not copied here in full; a vendor appears only when it has a chiropractic page of its own.',
    subsetNote: 'This site does not keep a separate chiropractic vendor directory. The table lists vendors whose own pages name chiropractic practices.',
    checks: [
      { h: 'Who the listing actually names', p: 'These vendors have a chiropractic page of their own. Still confirm in writing that chiropractic scheduling and intake are supported for your office. A medical or therapy mention by itself is not a chiropractic listing, which is why those directories are not copied here.' },
      { h: 'Booking and intake', p: 'Test a new-patient call, a reschedule, and an after-hours message against your real appointment lengths, and ask whether it writes into your practice software.' },
      { h: 'Health information', p: 'If you handle protected health information, ask for a signed Business Associate Agreement before those details are spoken. A HIPAA badge is not a signed agreement. Read the HIPAA notes in each listing, which are not the same for every vendor on this page.' },
      { h: 'Recording notice', p: "If the tool records or transcribes, match the announcement to the caller's state on the call recording consent page." },
    ],
    faqs: [
      { q: 'Do you have a chiropractic vendor directory?', a: 'This site does not keep a separate chiropractic directory. The table is the vendors whose own pages name chiropractic practices, with starting prices recorded from each vendor pricing page.' },
      { q: 'Which AI receptionist is best for a chiropractic office?', a: 'This site does not pick a winner. Compare the sourced starting prices, use the checks on this page, and run your own call volume on the calculator.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing, if one appears, is labeled. Payment does not change a price.' },
    ],
  },
  {
    slug: 'property-management',
    path: '/best/property-management/',
    vendorSlugs: ['abby-connect', 'dialzara', 'goodcall', 'marlie-ai', 'my-ai-front-desk', 'nextphone', 'rosie', 'smith-ai', 'upfirst'],
    accent: 'property',
    phrase: 'best AI receptionist for property management',
    h1: 'Best AI receptionist for property management',
    kicker: 'Property management',
    description: 'Best AI receptionist for property management: sourced starting prices from vendors with their own property-management pages, and no paid ranking. Open the calculator, the free call coverage check, or done-for-you setup.',
    lede: 'This page is for property-management companies comparing AI receptionists or answering services. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'This site does not keep a separate property-management vendor directory. The table lists vendors whose own pages name property managers. Every starting price is the text recorded from the vendor pricing page, with the date it was checked. Goodcall is included because its own Rent Manager integration page is written for property managers, not because a standalone Goodcall property-management industry page was found.',
    subsetNote: 'This site does not keep a separate property-management vendor directory. The table lists vendors whose own pages name property managers.',
    checks: [
      { h: 'After-hours maintenance', p: 'In a demo, ask how an after-hours maintenance call is taken, urgent issues are escalated, and a work order or message reaches your team.' },
      { h: 'Resident vs. applicant calls', p: 'Confirm the agent can tell a current resident from a leasing inquiry, and that each path follows your rules.' },
      { h: 'Software write-back', p: 'If you need a work order or a showing to land in your property-management software, test that write-back. A marketing or integration page is not the same as a booking in your live system.' },
      { h: 'Recording notice', p: "If calls are recorded, check the caller's state on the call recording consent page." },
    ],
    faqs: [
      { q: 'Do you have a property-management vendor directory?', a: 'This site does not keep a separate property-management directory. The table is the vendors whose own pages name property managers, with starting prices recorded from each vendor pricing page. Goodcall is listed from its Rent Manager integration page.' },
      { q: 'Which AI receptionist is best for a property manager?', a: 'This site does not pick a winner. Compare the sourced starting prices, use the checks on this page, and run your own call volume on the calculator.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing, if one appears, is labeled. Payment does not change a price.' },
    ],
  },
  {
    slug: 'auto-repair',
    path: '/best/auto-repair/',
    vendorSlugs: ['agentzap', 'autoleap-air', 'dialzara', 'justcall', 'my-ai-front-desk', 'nextphone', 'rosie', 'shopmonkey-concierge', 'smith-ai', 'upfirst'],
    accent: 'auto',
    phrase: 'best AI receptionist for auto repair shops',
    h1: 'Best AI receptionist for auto repair shops',
    kicker: 'Auto repair shops',
    description: 'Best AI receptionist for auto repair shops: sourced starting prices from vendors with their own auto-shop pages, and no paid ranking. Open the calculator, the free call coverage check, or done-for-you setup.',
    lede: 'This page is for auto repair shops comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'This site does not keep a separate auto-repair vendor directory. The table lists vendors whose own pages name auto repair shops. Every starting price is the text recorded from the vendor pricing page, with the date it was checked. AutoLeap AIR and Shopmonkey Concierge are built for shops already on those platforms; Shopmonkey Concierge is an add-on to a Shopmonkey plan.',
    subsetNote: 'This site does not keep a separate auto-repair vendor directory. The table lists vendors whose own pages name auto repair shops.',
    checks: [
      { h: 'After-hours and drop-off', p: 'In a demo, try an after-hours call and a request to schedule a drop-off or a ride, and see whether the shop gets a usable message.' },
      { h: 'Bay and advisor rules', p: 'Ask whether booking follows your advisor hours and bay limits, or only takes a callback request.' },
      { h: 'Shop software write-back', p: 'If you need the appointment in Tekmetric, Shopmonkey, AutoLeap, or another shop system, test that write-back before you rely on it. Some listings are add-ons for one platform only.' },
      { h: 'Recording notice', p: "If calls are recorded, check the caller's state on the call recording consent page." },
    ],
    faqs: [
      { q: 'Do you have an auto-repair vendor directory?', a: 'This site does not keep a separate auto-repair directory. The table is the vendors whose own pages name auto repair shops, with starting prices recorded from each vendor pricing page.' },
      { q: 'Which AI receptionist is best for an auto repair shop?', a: 'This site does not pick a winner. Compare the sourced starting prices, use the checks on this page, and run your own call volume on the calculator. If a listing is an add-on to shop software you do not use, it may not be a fit.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing, if one appears, is labeled. Payment does not change a price.' },
    ],
  },
  {
    slug: 'salons',
    path: '/best/salons/',
    vendorSlugs: ['agentzap', 'callpad', 'dialzara', 'glossgenius-reception', 'my-ai-front-desk', 'nextphone', 'rosie', 'upfirst'],
    accent: 'salon',
    phrase: 'best AI receptionist for salons',
    h1: 'Best AI receptionist for salons',
    kicker: 'Salons',
    description: 'Best AI receptionist for salons: sourced starting prices from vendors with their own salon pages, and no paid ranking. Med spas are a separate guide. Open the calculator, the free check, or done-for-you setup.',
    lede: 'This page is for hair, nail, and beauty salons comparing AI receptionists. It is not a ranked list. Rows are alphabetical, sponsored listings are labeled, and payment does not change a price.',
    scope: 'This site does not keep a separate salon vendor directory. The table lists vendors whose own pages name hair, nail, or beauty salons. Every starting price is the text recorded from the vendor pricing page, with the date it was checked. GlossGenius Reception is an add-on for GlossGenius users. Med spas are covered on a separate guide that uses the medical-practice directory, which is not a salon list.',
    subsetNote: 'This site does not keep a separate salon vendor directory. The table lists vendors whose own pages name hair, nail, or beauty salons.',
    checks: [
      { h: 'This is not the med-spa guide', p: 'If you run a med spa, use the med-spa guide, which is honest about using the medical-practice directory. This page is for salons.' },
      { h: 'Stylist and service booking', p: 'In a demo, try booking, moving, and canceling a service with the right stylist and duration, in the booking system you actually use.' },
      { h: 'Software write-back', p: 'Confirm the booking lands in your salon software. Some listings are add-ons for one platform only.' },
      { h: 'Recording notice', p: "If calls are recorded, check the caller's state on the call recording consent page." },
    ],
    storyLinks: [
      { href: '/best/med-spas/', label: 'Best AI receptionist for med spas' },
    ],
    faqs: [
      { q: 'Do you have a salon vendor directory?', a: 'This site does not keep a separate salon directory. The table is the vendors whose own pages name hair, nail, or beauty salons, with starting prices recorded from each vendor pricing page. The med-spa guide is a different page and uses the medical-practice directory.' },
      { q: 'Which AI receptionist is best for a salon?', a: 'This site does not pick a winner. Compare the sourced starting prices, use the checks on this page, and run your own call volume on the calculator.' },
      { q: 'Are these tools ranked?', a: 'No. Rows are alphabetical. A sponsored listing, if one appears, is labeled. Payment does not change a price.' },
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
  const guide = GUIDES.find((item) => item && item.industryKey === key);
  return guide ? { href: guide.path, label: guide.h1 } : null;
}

function selectVendors(guide, list) {
  if (guide.vendorSlugs) {
    const wanted = new Set(guide.vendorSlugs);
    return list.filter((vendor) => wanted.has(vendor.slug)).sort((a, b) => a.name.localeCompare(b.name));
  }
  if (guide.industryKey) return orderForIndustry(list, guide.industryKey);
  return [];
}

function buildGuide(guide, list) {
  const ordered = selectVendors(guide, list);
  const cost = guide.costPath ? costPage(guide.costPath) : null;
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
  const calculatorPath = guide.industryKey
    ? `/cost/calculator/?industry=${guide.industryKey}&calls=150&minutes=3`
    : '/cost/calculator/?calls=150&minutes=3';
  const dfyPath = guide.dfySlug ? dfyIndustryPath(guide.dfySlug) : DFY_PATH;
  const countLine = ordered.length === 0
    ? (guide.emptyLine || 'This site has no sourced vendor listings for this industry yet.')
    : guide.subsetNote
      ? `${guide.subsetNote} ${sentence}`
      : `${ordered.length} vendors are in the ${industryLabel(guide.industryKey).toLowerCase()} directory used on this page. ${sentence}`;
  const summary = [
    countLine,
    guide.lede,
    range || (ordered.length
      ? 'Monthly scenarios at 50, 150, and 300 calls are on the matching cost page, only where a vendor publishes enough to estimate a bill.'
      : 'Use the cost calculator with your own call volume. This page does not invent a typical bill for this industry.'),
  ];
  const related = [
    ...(guide.industryPath ? [{ href: guide.industryPath, label: `${industryLabel(guide.industryKey)} directory` }] : []),
    ...(cost ? [{ href: guide.costPath, label: cost.h1 }] : [{ href: '/cost/', label: 'What an AI receptionist will cost' }]),
    ...(extraCost ? [{ href: extraCost.path, label: extraCost.h1 }] : []),
    { href: calculatorPath, label: 'Cost calculator' },
    { href: dfyPath, label: guide.dfySlug ? 'Done-for-you setup for this industry' : 'Done-for-you setup' },
    { href: AUDIT_PATH, label: 'Free call coverage check' },
    { href: '/best/', label: 'All industry guides' },
    ...(guide.storyLinks || []),
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
    dfyPath,
    calculatorPath,
    auditPath: AUDIT_PATH,
  };
}
