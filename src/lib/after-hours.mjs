// Vendors whose own page, or the directory note, states after-hours or 24/7
// coverage. Quotes are the words we read. Prices stay on the vendor record.
export const COVERAGE = [
  {
    slug: 'autoleap-air',
    says: 'The AIR page says the receptionist keeps the shop connected 24/7, including after hours and holidays, and that it answers when the team is busy, after hours, or closed.',
    source: 'https://autoleap.com/air/',
    sourceLabel: 'autoleap.com/air',
    readOn: '2026-11-23',
  },
  {
    slug: 'glossgenius-reception',
    says: 'The directory note says Reception answers calls and texts 24/7. That note was not re-read on the vendor site on 23 November 2026. It is an add-on for GlossGenius users.',
    source: 'https://genius.ai/reception',
    sourceLabel: 'genius.ai/reception',
    readOn: '2026-11-14',
  },
  {
    slug: 'legalclerk-ai',
    says: 'The pricing page calls it a 24/7 AI legal receptionist. The FAQ says you can use it only after hours or on weekends.',
    source: 'https://legalclerk.ai/pricing',
    sourceLabel: 'legalclerk.ai/pricing',
    readOn: '2026-11-23',
  },
  {
    slug: 'marlie-ai',
    says: 'The Basic plan on the pricing page says the AI answers every call, 24/7.',
    source: 'https://www.marlie.ai/pricing',
    sourceLabel: 'marlie.ai/pricing',
    readOn: '2026-11-23',
  },
  {
    slug: 'nextphone',
    says: 'The pricing page says it answers every call, 24/7, and the page includes after-hours answering.',
    source: 'https://www.getnextphone.com/pricing',
    sourceLabel: 'getnextphone.com/pricing',
    readOn: '2026-11-23',
  },
  {
    slug: 'oncrew',
    says: 'The property-management page says it answers the business line 24/7 and that a call at 9 PM costs the same as one at 9 AM. The after-hours page says it answers in the company\'s name when the office is closed.',
    source: 'https://oncrew.ai/answering/property-management',
    sourceLabel: 'oncrew.ai property management',
    readOn: '2026-11-23',
  },
  {
    slug: 'rosie',
    says: 'The pricing page says the Professional plan is a 24/7 AI answering service, and that Rosie answers 24/7.',
    source: 'https://heyrosie.com/pricing',
    sourceLabel: 'heyrosie.com/pricing',
    readOn: '2026-11-23',
  },
  {
    slug: 'serviceagent',
    says: 'The pricing page\'s credit table says the 24/7 AI receptionist answers a client call.',
    source: 'https://serviceagent.ai/pricing',
    sourceLabel: 'serviceagent.ai/pricing',
    readOn: '2026-11-23',
  },
  {
    slug: 'upfirst',
    says: 'The pricing page lists 24/7 answering, and says you can choose every call, overflow only, or after hours.',
    source: 'https://upfirst.ai/pricing',
    sourceLabel: 'upfirst.ai/pricing',
    readOn: '2026-11-23',
  },
  {
    slug: 'viva-ai',
    says: 'The homepage says the receptionist answers 24/7. The Gold plan is labeled an after-hours dental answering service.',
    source: 'https://www.getviva.ai/',
    sourceLabel: 'getviva.ai',
    readOn: '2026-11-23',
  },
  {
    slug: 'zinng-ai',
    says: 'The homepage says every call is answered 24/7, even at 2 AM, and that you can use it after hours, all hours, or as overflow.',
    source: 'https://zinng.ai/',
    sourceLabel: 'zinng.ai',
    readOn: '2026-11-23',
  },
];

export function coverageRows(vendors) {
  return COVERAGE.map((item) => {
    const vendor = vendors.find((row) => row.slug === item.slug);
    if (!vendor) return null;
    return {
      ...item,
      name: vendor.name,
      price: vendor.starting_price || '',
      checked: vendor.last_checked || '',
    };
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
