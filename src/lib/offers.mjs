// Done-for-you setup: the approved prices and their Stripe Payment Links.
// One place for every page, test and generated file that names these offers.

export const DFY_PATH = '/done-for-you/';
export const DFY_EMAIL = 'timothy@aiphonecompare.com';
export const FOUNDING_SPOTS = 5;

export const DFY_OFFERS = {
  founding: {
    key: 'founding',
    name: 'Founding rate',
    price: 1000,
    url: 'https://buy.stripe.com/7sYcN5g6f86pfNu5fQ9ws01',
  },
  standard: {
    key: 'standard',
    name: 'Standard rate',
    price: 1500,
    url: 'https://buy.stripe.com/3cIbJ107hgCV58Q0ZA9ws02',
  },
};

// "$1,500"
export const usd = (n) => `$${n.toLocaleString('en-US')}`;

// One line used in llms.txt and llms-full.txt.
export const DFY_SUMMARY = `We pick, set up and tune your AI receptionist. ${usd(DFY_OFFERS.standard.price)} one-time (${usd(DFY_OFFERS.founding.price)} founding rate for the first ${FOUNDING_SPOTS} businesses), with a full refund of our fee if the defined result is not reached by day 60.`;

// Stripe sends buyers back to /done-for-you/?paid=1 after payment.
export function isPaidReturn(search) {
  try {
    return new URLSearchParams(search || '').get('paid') === '1';
  } catch {
    return false;
  }
}

// Service JSON-LD with one Offer per price.
export function dfyServiceJsonld({ name, description, pageUrl, orgId }) {
  const { founding, standard } = DFY_OFFERS;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: pageUrl,
    serviceType: 'AI receptionist setup',
    provider: { '@id': orgId },
    offers: [
      {
        '@type': 'Offer',
        name: `${founding.name} (first ${FOUNDING_SPOTS} businesses)`,
        price: String(founding.price),
        priceCurrency: 'USD',
        url: pageUrl,
      },
      {
        '@type': 'Offer',
        name: standard.name,
        price: String(standard.price),
        priceCurrency: 'USD',
        url: pageUrl,
      },
    ],
  };
}

// Competitor teardown for vendors: approved price, refund window and Stripe Payment Link.
export const TEARDOWN = {
  path: '/teardown/',
  name: 'Competitor teardown',
  price: 199,
  refundDays: 14,
  url: 'https://buy.stripe.com/cNidR92fpaex6cU7nY9ws03',
};
