// Price index helpers. Pure functions, no I/O. Every value comes from the
// records passed in; nothing is estimated or filled in.

export const SOURCE_TYPES = {
  vendor: 'Vendor page',
  third: 'Third-party',
  unknown: 'Not classified',
  none: 'No source',
};

// Hostname of a URL, lowercased, without a leading "www.". '' when unparseable.
export function hostOf(url) {
  try {
    return new URL(String(url || '').trim()).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Where a vendor's price came from.
// - "Vendor page": the source host equals the vendor website host, or is a subdomain of it.
// - "Third-party": the vendor website is on file and the source host is a different site.
// - "Not classified": no vendor website on file, so the source cannot be matched honestly.
// - "No source": no parseable source URL.
export function classifySource(sourceUrl, website) {
  const src = hostOf(sourceUrl);
  if (!src) return SOURCE_TYPES.none;
  const site = hostOf(website);
  if (!site) return SOURCE_TYPES.unknown;
  return src === site || src.endsWith(`.${site}`) ? SOURCE_TYPES.vendor : SOURCE_TYPES.third;
}

// A published dollar price: the starting price text contains a "$" amount.
// Same test the Offer schema uses (src/lib/schema.mjs vendorOffer).
export function hasDollarPrice(v) {
  return /\$\d/.test(v?.starting_price || '');
}

// One row per vendor, sorted by name. Starting price text is kept verbatim.
export function indexRows(vendors) {
  return [...vendors]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((v) => {
      const source = (v.sources || [])[0] || '';
      return {
        slug: v.slug,
        name: v.name,
        startingPrice: v.starting_price || '',
        billingModel: v.billing_model || '',
        lastChecked: v.last_checked || '',
        source,
        sourceHost: hostOf(source),
        sourceType: classifySource(source, v.website),
        hasDollarPrice: hasDollarPrice(v),
        vendor: v,
      };
    });
}

// Latest YYYY-MM-DD last_checked across vendors, or ''.
export function latestDate(vendors) {
  return vendors.map((v) => v.last_checked).filter(Boolean).sort().at(-1) || '';
}

// Price changes, newest observed first (ties keep file order).
export function changesNewestFirst(log) {
  return [...(log?.changes || [])]
    .map((c, i) => [c, i])
    .sort(([a, ia], [b, ib]) => String(b.observed || '').localeCompare(String(a.observed || '')) || ia - ib)
    .map(([c]) => c);
}

// Headline figures for the index, all counted from the data.
export function indexSummary(vendors, log) {
  const rows = indexRows(vendors);
  const count = (type) => rows.filter((r) => r.sourceType === type).length;
  const withPrice = rows.filter((r) => r.hasDollarPrice).length;
  return {
    listed: rows.length,
    withPrice,
    withoutPrice: rows.length - withPrice,
    vendorSource: count(SOURCE_TYPES.vendor),
    thirdPartySource: count(SOURCE_TYPES.third),
    unclassifiedSource: count(SOURCE_TYPES.unknown),
    noSource: count(SOURCE_TYPES.none),
    changes: (log?.changes || []).length,
    trackingStarted: log?.trackingStarted || '',
    latest: latestDate(vendors),
  };
}

// Answer-first intro sentences. formatDate turns YYYY-MM-DD into display text.
export function introSentences(summary, formatDate = (d) => d) {
  const s = summary;
  const out = [];
  const asOf = s.latest ? `As of ${formatDate(s.latest)}, the` : 'The';
  out.push(`${asOf} index holds ${s.withPrice} AI receptionist${s.withPrice === 1 ? '' : 's'} with a published starting price, out of ${s.listed} listed.`);
  if (s.trackingStarted) {
    out.push(`${s.changes} price change${s.changes === 1 ? '' : 's'} logged since ${formatDate(s.trackingStarted)}.`);
  }
  return out;
}

// Plain citation line.
export function citationLine(latest, formatDate = (d) => d, url = 'https://aiphonecompare.com/price-index/') {
  return `aiphonecompare, AI receptionist price index, prices checked ${latest ? formatDate(latest) : 'date not recorded'}, ${url}`;
}

// schema.org Dataset for the vendor dataset. site has no trailing slash.
export function datasetJsonld({ site, url, name, description, latest, trackingStarted }) {
  const ds = {
    '@type': 'Dataset',
    name,
    description,
    url,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@id': `${site}/#organization` },
    publisher: { '@id': `${site}/#organization` },
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${site}/data/vendors.csv` },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${site}/data/vendors.json` },
    ],
  };
  if (latest) ds.dateModified = latest;
  if (trackingStarted && latest) {
    // ISO 8601 interval; ordered so start <= end.
    const [a, b] = [trackingStarted, latest].sort();
    ds.temporalCoverage = `${a}/${b}`;
  }
  return ds;
}
