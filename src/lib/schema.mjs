// Helpers for JSON-LD and quoteable summaries. Nothing here invents a value:
// every field comes from src/data, and a missing field is left out.

// Latest last_checked date across vendors, or '' when none has one.
export function latestChecked(vendors) {
  return vendors.map((v) => v.last_checked).filter(Boolean).sort().at(-1) || '';
}

// Offer for a vendor's published starting price. The free-text price is kept
// as text; it is never parsed into a numeric `price`. Only built when the text
// contains a dollar amount, so "Custom quote" or "Not published" get no Offer.
export function vendorOffer(v) {
  const text = (v.starting_price || '').trim();
  if (!/\$\d/.test(text)) return null;
  const url = (v.sources || [])[0] || v.website || '';
  const offer = {
    '@type': 'Offer',
    name: `${v.name} starting price`,
    description: text,
    seller: { '@type': 'Organization', name: v.name },
    priceSpecification: { '@type': 'PriceSpecification', description: text, priceCurrency: 'USD' },
    priceCurrency: 'USD',
  };
  if (url) offer.url = url;
  if (v.last_checked) offer.validFrom = v.last_checked;
  return offer;
}

// First sentence of a text, or the whole text when it has no sentence break.
export function firstSentence(text) {
  const match = String(text || '').trim().match(/^(.+?[.!?])(?=\s|$)/);
  return match ? match[1] : String(text || '').trim();
}

// One quoteable lead for a price-change page, built from the record only:
// the first sentence of the summary, the observed date, and who published the
// sources. Full source titles stay in the Sources list and JSON-LD citations.
export function priceChangeLead(change, formatDate) {
  const what = firstSentence(change.summary);
  const publishers = [...new Set((change.sources || []).map((s) => s.publisher || s.title).filter(Boolean))];
  const list = publishers.length <= 1 ? publishers.join('') : `${publishers.slice(0, -1).join(', ')} and ${publishers.at(-1)}`;
  const parts = [];
  if (change.observed) parts.push(`Observed ${formatDate(change.observed)}`);
  if (list) parts.push(`${parts.length ? 'based on' : 'Based on'} sources published by ${list}`);
  return parts.length ? `${what} ${parts.join(', ')}.` : what;
}
