// Landing pages for searches the directory can answer from sourced records.
// A missing price stays missing. Call count is never turned into unique callers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimatePlan, formatUsd } from './cost.mjs';
import { formatDate, industryLabel, sourceDate } from './stories.mjs';
import { compareSummary, vendorCostSummary, sourceLinks } from './answers.mjs';
import { outboundLink } from './outbound.mjs';
import { AUDIT_PATH, showAuditLinks } from './audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', name), 'utf8'));

export const CALL_VOLUMES = [50, 150, 300];
export const ASSUMED_MINUTES = 3;

const INDUSTRY_COST = {
  dental: '/cost/dental/',
  legal: '/cost/legal/',
  plumbing: '/cost/home-services/',
  medical: '/cost/medical/',
};

// Slim vendor record for the structured price view (PricePlans) in Landing tables.
function priceVendor(vendor) {
  return {
    slug: vendor.slug,
    name: vendor.name,
    starting_price: vendor.starting_price || '',
    last_checked: vendor.last_checked || '',
    sources: (vendor.sources || []).slice(0, 1),
    industries: vendor.industries || [],
  };
}

function cell(text, extra = {}) {
  return { text: text || 'Not verified', ...extra };
}

let _vendorsBySlug;
function vendorsBySlug(list) {
  if (list) return Object.fromEntries(list.map((vendor) => [vendor.slug, vendor]));
  if (!_vendorsBySlug) _vendorsBySlug = vendorsBySlug(read('vendors.json'));
  return _vendorsBySlug;
}

function visitFor(vendor) {
  if (!vendor) return null;
  const outbound = outboundLink(vendor);
  if (!outbound) return null;
  return { href: outbound.href, rel: outbound.rel, isReferral: outbound.isReferral, slug: vendor.slug, name: vendor.name };
}

function referralNames(list) {
  return (list || []).filter((vendor) => outboundLink(vendor)?.isReferral).map((vendor) => vendor.name);
}

function oneTime(plan) {
  if (plan.setupFee == null) return 'Not verified';
  if (plan.setupFee === 0) return 'No setup fee on the pricing page';
  return `${formatUsd(Math.round(plan.setupFee * 100))} one time`;
}

function scenarioText(provider, estimate) {
  if (provider.unit === 'customer') {
    return 'Not estimated: charged per different caller, not per call.';
  }
  if (estimate.status === 'estimate') return formatUsd(estimate.scenarioCents);
  if (estimate.status === 'partial' && estimate.scenarioCents != null) {
    return `${formatUsd(estimate.scenarioCents)} partial. ${estimate.reason}`;
  }
  return `Not estimated. ${estimate.reason || 'The pricing page does not publish enough to calculate this.'}`;
}

function planRows(providers) {
  const rows = [];
  for (const provider of providers) {
    for (const plan of provider.plans) {
      const estimates = {};
      for (const calls of CALL_VOLUMES) {
        const estimate = estimatePlan(
          { ...plan, unit: plan.unit || provider.unit },
          { calls, durationMinutes: ASSUMED_MINUTES },
        );
        estimates[calls] = { ...estimate, text: scenarioText(provider, estimate) };
      }
      rows.push({
        provider: provider.name,
        slug: provider.slug,
        plan: plan.name,
        estimates,
        oneTime: oneTime(plan),
        published: plan.publishedLabel,
      });
    }
  }
  return rows;
}

function rangeSentence(rows, calls) {
  const complete = rows.filter((row) => row.estimates[calls].status === 'estimate' && row.estimates[calls].scenarioCents != null);
  const label = `${calls} calls a month`;
  if (!complete.length) {
    return `At ${label}, none of these published plans can be turned into a complete monthly figure from call count alone.`;
  }
  const sorted = [...complete].sort((a, b) => a.estimates[calls].scenarioCents - b.estimates[calls].scenarioCents);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const lowText = `${low.estimates[calls].text} for ${low.provider} ${low.plan}`;
  if (low.estimates[calls].scenarioCents === high.estimates[calls].scenarioCents && sorted.length === 1) {
    return `At ${label}, the only complete estimate is ${lowText}.`;
  }
  if (low.estimates[calls].scenarioCents === high.estimates[calls].scenarioCents) {
    return `At ${label}, every complete estimate is ${low.estimates[calls].text}.`;
  }
  return `At ${label}, full monthly estimates range from ${lowText} to ${high.estimates[calls].text} for ${high.provider} ${high.plan}. That is simple math on each company’s listed prices, not a ranking.`;
}

function scenarioTable(rows, caption) {
  return {
    type: 'table',
    caption,
    headers: ['Provider', 'Plan', '50 calls', '150 calls', '300 calls', 'One-time', 'Published price'],
    rows: rows.map((row) => [
      cell(row.provider, { href: `/vendors/${row.slug}/`, visit: visitFor(vendorsBySlug()[row.slug]) }),
      cell(row.plan),
      cell(row.estimates[50].text),
      cell(row.estimates[150].text),
      cell(row.estimates[300].text),
      cell(row.oneTime),
      cell(row.published),
    ]),
  };
}

function caveatBlock(providers) {
  return {
    type: 'list',
    heading: 'Fees and limits stated on the pricing pages',
    items: providers.flatMap((provider) => provider.caveats.map((text) => ({
      text: `${provider.name}: ${text}`,
      href: provider.sources[0]?.href,
      external: true,
    }))),
  };
}

function moneyFacts(rows) {
  return [
    ...rows.flatMap((row) => [row.estimates[50].text, row.estimates[150].text, row.estimates[300].text, row.oneTime, row.published]),
  ].join(' ');
}

function providersFor(models, vendors, industry) {
  const bySlug = Object.fromEntries(vendors.map((vendor) => [vendor.slug, vendor]));
  return models.providers
    .filter((provider) => bySlug[provider.slug]?.industries?.includes(industry))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function startingTable(vendors, industry) {
  const rows = vendors
    .filter((vendor) => vendor.industries?.includes(industry) && vendor.starting_price)
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    type: 'table',
    caption: 'Starting prices recorded for this industry. A starting price is not a bill at 50, 150, or 300 calls.',
    headers: ['Vendor', 'Starting price', 'Billing'],
    rows: rows.map((vendor) => [
      cell(vendor.name, { href: `/vendors/${vendor.slug}/`, visit: visitFor(vendor) }),
      cell(vendor.starting_price, { price: priceVendor(vendor), meta: true }),
      cell(vendor.billing_model),
    ]),
  };
}

function exclusionSentences(providers) {
  const sentences = [];
  if (providers.some((provider) => provider.id === 'bland-ai')) {
    sentences.push('Bland rows are talk time plus the published platform fee. The pricing page says telephony is billed separately and does not print one rate, so it is not added.');
  }
  if (providers.some((provider) => provider.id === 'elevenlabs')) {
    sentences.push('ElevenLabs rows are the published call-minute price. The pricing page says LLM usage and a connected carrier are billed separately, so those charges are not added.');
  }
  return sentences;
}

function industryPage({ models, vendors, key, path, h1, phrase, description, lede }) {
  const providers = providersFor(models, vendors, key);
  const rows = planRows(providers);
  const names = providers.map((provider) => provider.name).join(', ');
  const customer = providers.filter((provider) => provider.unit === 'customer').map((provider) => provider.name);
  const starters = vendors.filter((vendor) => vendor.industries?.includes(key) && vendor.starting_price).sort((a, b) => a.name.localeCompare(b.name));
  const answer = [
    lede,
    `The monthly figures below use prices checked ${formatDate(models.checked)}. For plans that charge by the minute, we assume calls average ${ASSUMED_MINUTES} minutes (our guess, not the company's). Plans that charge by the call ignore length. One-time fees are shown separately.`,
    `Providers with enough published math in this industry: ${names}.`,
    customer.length ? `${customer.join(' and ')} charges per different caller (not per call), so those rows are listed but not estimated from call count.` : '',
    ...exclusionSentences(providers),
    `The starting-price table lists ${starters.length} vendors with a recorded price, from ${starters[0]?.name || 'none'} to ${starters.at(-1)?.name || 'none'}.`,
    rangeSentence(rows, 50),
    rangeSentence(rows, 150),
    rangeSentence(rows, 300),
  ].filter(Boolean);
  const faqs = [
    {
      q: `What does this cost at 150 calls a month?`,
      a: `${rangeSentence(rows, 150)} Minute plans in that sentence use a ${ASSUMED_MINUTES}-minute average call. The table lists every published plan, including rows that cannot be estimated.`,
    },
    {
      q: 'Are one-time fees included in the monthly figure?',
      a: 'No. A printed setup fee is in the one-time column. A setup fee that is not printed is "Not verified" and is not treated as zero.',
    },
    {
      q: 'Is the lowest figure the recommended plan?',
      a: 'No. The range of full estimates is simple math on each company’s listed prices at one call count. Rows are alphabetical. Rankings are not for sale, and a sponsored listing does not change these figures.',
    },
  ];
  const summary = [
    rangeSentence(rows, 150).replace(' That is simple math on each company’s listed prices, not a ranking.', ' That is simple math on each company’s listed prices, not a ranking.'),
    `Plans that charge by the minute assume ${ASSUMED_MINUTES}-minute calls; one-time fees are listed separately.`,
    `The starting-price table below lists ${starters.length} vendors with a recorded price.`,
  ];
  return {
    summary,
    verified: models.checked,
    sources: sourceLinks(providers.flatMap((provider) => provider.sources.map((source) => source.href)), 4),
    kind: 'industry',
    topic: path.split('/').filter(Boolean).at(-1),
    path,
    phrase,
    title: `${h1} (${models.checked.slice(0, 4)})`,
    h1,
    description,
    date: models.checked,
    answer,
    blocks: [
      scenarioTable(rows, `Estimated monthly cost at 50, 150, and 300 calls. Plans that charge by the minute assume ${ASSUMED_MINUTES}-minute calls. Checked ${formatDate(models.checked)}.`),
      caveatBlock(providers),
      startingTable(vendors, key),
    ],
    faqs,
    vendorSlugs: providers.map((provider) => provider.slug),
    referrals: referralNames(vendors.filter((vendor) => vendor.industries?.includes(key))),
    industries: [key],
    dollars: `${moneyFacts(rows)} ${answer.join(' ')}`,
    crumbs: [
      { name: 'Home', href: '/' },
      { name: 'Cost', href: '/cost/' },
      { name: h1, href: path },
    ],
  };
}

function vendorCostPage({ models, slug, h1, phrase, description }) {
  const provider = models.providers.find((item) => item.slug === slug);
  const rows = planRows([provider]);
  const answer = [
    `${provider.name} publishes the plans below. This page prices those plans at 50, 150, and 300 calls a month. Prices were checked ${formatDate(models.checked)}.`,
    provider.unit === 'minute'
      ? `The minute plans use a ${ASSUMED_MINUTES}-minute average call. That length is an assumption. Partial minutes are not rounded up.`
      : provider.unit === 'call'
        ? 'These plans bill per call. The call length does not change the figure.'
        : 'These plans charge per different caller, not per call, so we can’t estimate them from a call count.',
    ...exclusionSentences([provider]),
    rangeSentence(rows, 50),
    rangeSentence(rows, 150),
    rangeSentence(rows, 300),
    `Sources: ${provider.sources.map((source) => source.label).join(', ')}.`,
  ];
  const summary = vendorCostSummary({ provider, rangeAt: (calls) => rangeSentence(rows, calls) });
  return {
    summary,
    verified: models.checked,
    sources: sourceLinks(provider.sources.map((source) => source.href), 3),
    kind: 'vendor-cost',
    topic: pathTopic(slug === 'elevenlabs-ai-receptionist' ? 'elevenlabs' : slug),
    path: slug === 'elevenlabs-ai-receptionist' ? '/cost/elevenlabs/' : `/cost/${slug}/`,
    phrase,
    title: /pricing/i.test(h1) ? `${h1} (${models.checked.slice(0, 4)})` : `${provider.name} pricing: ${h1.replace(provider.name + ' ', '')} (${models.checked.slice(0, 4)})`,
    h1,
    description,
    date: models.checked,
    answer,
    blocks: [
      scenarioTable(rows, `${provider.name} plans at 50, 150, and 300 calls. Checked ${formatDate(models.checked)}.`),
      caveatBlock([provider]),
    ],
    faqs: [
      {
        q: `How much does ${provider.name} cost at 150 calls a month?`,
        a: rangeSentence(rows, 150),
      },
      {
        q: `Does ${provider.name} publish a setup fee?`,
        a: rows.some((row) => row.oneTime.startsWith('$'))
          ? `Yes. ${rows.filter((row) => row.oneTime.startsWith('$')).map((row) => `${row.plan} lists ${row.oneTime}`).join(' ')} A plan marked "Not verified" does not print a setup fee on the page we checked, and that is not treated as zero.`
          : `No setup fee is added. ${rows.map((row) => `${row.plan}: ${row.oneTime}`).join(' ')}`,
      },
      {
        q: 'Can I use a different call length?',
        a: `Yes. The calculator at /cost/ uses the same published cards and lets you change the call count and the average length. This page fixes the examples at 50, 150, and 300 calls${provider.unit === 'minute' ? ` and ${ASSUMED_MINUTES} minutes` : ''}.`,
      },
    ],
    vendorSlugs: [slug],
    industries: [],
    dollars: `${moneyFacts(rows)} ${answer.join(' ')}`,
    crumbs: [
      { name: 'Home', href: '/' },
      { name: 'Cost', href: '/cost/' },
      { name: h1, href: slug === 'elevenlabs-ai-receptionist' ? '/cost/elevenlabs/' : `/cost/${slug}/` },
    ],
  };
}

function pathTopic(slug) {
  return slug;
}

function blank(value) {
  const text = value == null ? '' : String(value).trim();
  return text || 'Not verified';
}

function comparePage({ models, vendors, pair, slugs, h1, phrase, description, scope }) {
  const selected = slugs.map((slug) => vendors.find((vendor) => vendor.slug === slug));
  const providers = slugs
    .map((slug) => models.providers.find((provider) => provider.slug === slug))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = providers.length ? planRows(providers) : [];
  const [left, right] = selected;
  const answer = [
    scope,
    `${left.name}'s recorded starting price is ${blank(left.starting_price)}. Billing: ${blank(left.billing_model)}. Price checked ${left.last_checked ? formatDate(left.last_checked) : 'date not verified'}.`,
    `${right.name}'s recorded starting price is ${blank(right.starting_price)}. Billing: ${blank(right.billing_model)}. Price checked ${right.last_checked ? formatDate(right.last_checked) : 'date not verified'}.`,
    providers.length
      ? [
          `Cost estimates use prices checked ${formatDate(models.checked)}, at 50, 150, and 300 calls.`,
          providers.some((provider) => provider.unit === 'minute') ? `Minute plans use a ${ASSUMED_MINUTES}-minute average call.` : '',
          'A company that does not publish enough prices has no estimate row.',
        ].filter(Boolean).join(' ')
      : 'Neither vendor is in our cost calculator, so this page does not calculate a bill at 50, 150, or 300 calls.',
    rows.length ? rangeSentence(rows, 150) : '',
  ].filter(Boolean);
  const fields = [
    ['Starting price', (vendor) => blank(vendor.starting_price)],
    ['Billing model', (vendor) => blank(vendor.billing_model)],
    ['Free trial', (vendor) => blank(vendor.free_trial)],
    ['Human handoff', (vendor) => blank(vendor.human_handoff)],
    ['HIPAA privacy agreement (BAA)', (vendor) => blank(vendor.hipaa_baa)],
    ['Industries', (vendor) => (vendor.industries || []).map((id) => industryLabel(id)).join(', ') || 'Not verified'],
    ['Notes', (vendor) => blank(vendor.notes)],
    ['Price checked', (vendor) => (vendor.last_checked ? formatDate(vendor.last_checked) : 'Not verified')],
  ];
  const attributeRows = fields.map(([label, readField]) => [
    cell(label),
    ...selected.map((vendor) => cell(readField(vendor), label === 'Price checked' && vendor.last_checked ? { datetime: vendor.last_checked } : label === 'Starting price' ? { price: priceVendor(vendor) } : {})),
  ]);
  attributeRows.push([
    cell('Visit'),
    ...selected.map((vendor) => {
      const visit = visitFor(vendor);
      return visit
        ? cell(`Visit ${vendor.name}`, { href: visit.href, external: true, rel: visit.rel, visit })
        : cell('Not verified');
    }),
  ]);
  const blocks = [
    {
      type: 'table',
      caption: `${left.name} and ${right.name} from the directory records. Empty fields stay "Not verified".`,
      headers: ['Field', ...selected.map((vendor) => vendor.name)],
      rows: attributeRows,
    },
  ];
  if (rows.length) {
    blocks.push(scenarioTable(rows, `Plans we can run at 50, 150, and 300 calls. Checked ${formatDate(models.checked)}.`));
    blocks.push(caveatBlock(providers));
  }
  const summary = compareSummary({
    left,
    right,
    providers,
    rangeAt: rows.length ? (calls) => rangeSentence(rows, calls) : null,
  });
  return {
    summary,
    verified: [left, right].filter((vendor) => vendor.last_checked).map((vendor) => ({ name: vendor.name, date: vendor.last_checked })),
    sources: sourceLinks([...(left.sources || []).slice(0, 1), ...(right.sources || []).slice(0, 1), ...providers.flatMap((provider) => provider.sources.map((source) => source.href))], 4),
    kind: 'compare',
    pair,
    path: `/compare/${pair}/`,
    phrase,
    title: /cost|price/i.test(h1) ? `${h1} (${models.checked.slice(0, 4)})` : `${h1}: price comparison (${models.checked.slice(0, 4)})`,
    h1,
    description,
    date: models.checked,
    answer,
    blocks,
    faqs: [
      {
        q: `Which is listed at a lower starting price, ${left.name} or ${right.name}?`,
        a: `The recorded starting prices are not the same kind of number, so this page does not pick a winner. ${left.name}: ${blank(left.starting_price)} ${right.name}: ${blank(right.starting_price)}`,
      },
      {
        q: 'Can both be priced at 150 calls a month?',
        a: rows.length ? rangeSentence(rows, 150) : 'No. Neither company publishes how much is included and what extra use costs, so no 150-call bill is calculated.',
      },
      {
        q: 'Do the listings say a person can take the call?',
        a: `${left.name}: ${blank(left.human_handoff)} ${right.name}: ${blank(right.human_handoff)}`,
      },
      {
        q: `Do ${left.name} and ${right.name} offer a free trial?`,
        a: `${left.name}: ${blank(left.free_trial)}. ${right.name}: ${blank(right.free_trial)}. "Not verified" means the source we checked does not state one.`.replace(/\.\./g, '.'),
      },
      {
        q: `Will ${left.name} or ${right.name} sign a HIPAA privacy agreement (BAA)?`,
        a: `${left.name}: ${left.hipaa_baa ? left.hipaa_baa : 'Not stated'}. ${right.name}: ${right.hipaa_baa ? right.hipaa_baa : 'Not stated'}. A "HIPAA compliant" line is not a signed privacy agreement, so ask for it in writing.`.replace(/\.\./g, '.'),
      },
      {
        q: `What do ${left.name} and ${right.name} integrate with?`,
        a: `${left.name}: ${blank(left.integrations)}. ${right.name}: ${blank(right.integrations)}.`.replace(/\.\./g, '.'),
      },
      {
        q: `Does aiphonecompare earn money from ${left.name} or ${right.name}?`,
        a: (() => {
          const ref = selected.filter((vendor) => outboundLink(vendor)?.isReferral).map((vendor) => vendor.name);
          const spons = selected.filter((vendor) => vendor.sponsored).map((vendor) => vendor.name);
          const parts = [];
          if (ref.length) parts.push(`We have a referral link with ${ref.join(' and ')}, so we may earn a fee if you sign up through it.`);
          if (spons.length) parts.push(`${spons.join(' and ')} ${spons.length > 1 ? 'have' : 'has'} a labeled sponsored placement.`);
          if (!parts.length) parts.push(`No. We have no referral link or sponsorship with ${left.name} or ${right.name}.`);
          parts.push('Neither changes the prices, the order, or what this page says.');
          return parts.join(' ');
        })(),
      },
    ],
    vendorSlugs: slugs,
    referrals: referralNames(selected),
    industries: [...new Set(selected.flatMap((vendor) => vendor.industries || []))],
    dollars: `${moneyFacts(rows)} ${selected.map((vendor) => [vendor.starting_price, vendor.free_trial, vendor.hipaa_baa, vendor.integrations, vendor.human_handoff].filter(Boolean).join(' ')).join(' ')} ${answer.join(' ')}`,
    crumbs: [
      { name: 'Home', href: '/' },
      { name: 'Compare', href: '/vendors/' },
      { name: h1, href: `/compare/${pair}/` },
    ],
  };
}

function hiddenFeesPage({ models, stories }) {
  const rows = planRows(models.providers);
  const feeRows = rows.map((row) => {
    const provider = models.providers.find((item) => item.slug === row.slug);
    return [
      cell(row.provider, { href: `/vendors/${row.slug}/`, visit: visitFor(vendorsBySlug()[row.slug]) }),
      cell(row.plan),
      cell(row.oneTime),
      cell(provider.sources[0].label, { href: provider.sources[0].href, external: true }),
    ];
  });
  const catches = new Map();
  for (const story of stories) {
    for (const item of story.catches || []) {
      if (!catches.has(item.id)) catches.set(item.id, { label: item.label, stories: [] });
      catches.get(item.id).stories.push(story);
    }
  }
  const catchItems = [...catches.values()]
    .sort((a, b) => b.stories.length - a.stories.length || a.label.localeCompare(b.label))
    .map((group) => ({
      text: `${group.label}. Recorded in ${group.stories.length} ${group.stories.length === 1 ? 'story' : 'stories'}, including ${group.stories[0].title}.`,
      href: `/stories/${group.stories[0].slug}/`,
    }));
  const printed = rows.filter((row) => row.oneTime.startsWith('$'));
  const answer = [
    'A fee is included here only when a pricing page states it, or a sourced story records the catch. A fee that is not printed is "Not verified" and is not treated as zero.',
    printed.length
      ? `Printed one-time fees in our cost calculator, checked ${formatDate(models.checked)}: ${printed.map((row) => `${row.provider} ${row.plan}, ${row.oneTime}`).join('; ')}.`
      : `No plan in our cost calculator, checked ${formatDate(models.checked)}, prints a dollar setup fee.`,
    'The story catches below are mostly limits on the service, not a second price. Each one is included because a story on this site records it.',
  ];
  return {
    summary: answer.slice(0, 2),
    verified: models.checked,
    sources: [],
    kind: 'fees',
    topic: 'hidden-fees',
    path: '/cost/hidden-fees/',
    phrase: 'AI receptionist hidden fees',
    title: `Hidden fees in AI receptionist pricing (${models.checked.slice(0, 4)})`,
    h1: 'Hidden fees in AI receptionist pricing',
    description: 'Hidden fees in AI receptionist pricing: printed setup fees, pricing-page limits, and catches from sourced stories. Unpublished fees are not treated as zero.',
    date: models.checked,
    answer,
    blocks: [
      {
        type: 'table',
        caption: `One-time fees from each plan in our cost calculator. Checked ${formatDate(models.checked)}.`,
        headers: ['Provider', 'Plan', 'One-time fee', 'Pricing page'],
        rows: feeRows,
      },
      caveatBlock(models.providers),
      { type: 'list', heading: 'Catches recorded in the stories', items: catchItems },
    ],
    faqs: [
      {
        q: 'Which plans print a setup fee?',
        a: printed.length
          ? printed.map((row) => `${row.provider} ${row.plan} lists ${row.oneTime}.`).join(' ')
          : 'None of the plans in our cost calculator list a dollar setup fee.',
      },
      {
        q: 'Are unpublished fees treated as free?',
        a: 'No. "Not verified" means the pricing page we checked does not print that fee. It is left out of the monthly estimate rather than counted as zero.',
      },
      {
        q: 'What catches show up in more than one story?',
        a: [...catches.values()]
          .filter((group) => group.stories.length > 1)
          .map((group) => `${group.label} (${group.stories.length} stories)`)
          .join('; ') || 'No catch is repeated across stories.',
      },
    ],
    vendorSlugs: models.providers.map((provider) => provider.slug),
    industries: [],
    dollars: `${moneyFacts(rows)} ${answer.join(' ')}`,
    crumbs: [
      { name: 'Home', href: '/' },
      { name: 'Cost', href: '/cost/' },
      { name: 'Hidden fees', href: '/cost/hidden-fees/' },
    ],
  };
}

function worthPage({ stories }) {
  const stopped = stories.filter((story) => (story.catches || []).some((item) => item.id === 'callers-reject-ai'));
  const priced = stories.filter((story) => story.cost);
  const answer = [
    `The sourced stories do not support a single yes or no. ${stopped.length} ${stopped.length === 1 ? 'story says' : 'stories say'} callers pushed back and the business stopped the AI. ${priced.length} ${priced.length === 1 ? 'story states' : 'stories state'} a dollar figure. The others do not state a price.`,
    'Nothing on this page turns a story into a savings estimate. Where the source gives no dollar amount, the cell says "Not stated".',
  ];
  return {
    summary: answer.slice(0, 2),
    verified: stories.map((story) => sourceDate(story)).filter(Boolean).sort().at(-1) || '',
    sources: [],
    kind: 'worth',
    path: '/worth-it/',
    phrase: 'is ai receptionist worth it',
    title: 'Is an AI receptionist worth it?',
    h1: 'Is an AI receptionist worth it?',
    description: 'Is an AI receptionist worth it? Sourced stories, with a price only when the source states one. Three stories say the business stopped.',
    date: stories.map((story) => sourceDate(story)).filter(Boolean).sort().at(-1) || '',
    answer,
    blocks: [
      {
        type: 'table',
        caption: 'What each sourced story says about cost and outcome. Vendor-told stories are the vendor’s own case study.',
        headers: ['Story', 'Cost in the source', 'Evidence', 'Source dated'],
        rows: stories.map((story) => [
          cell(story.title, { href: `/stories/${story.slug}/` }),
          cell(story.cost || 'Not stated'),
          cell(story.evidence === 'vendor-told' ? 'Vendor-told' : 'Independent'),
          cell(formatDate(sourceDate(story)), { datetime: sourceDate(story) }),
        ]),
      },
      {
        type: 'list',
        heading: 'Stories that say the business stopped',
        items: stopped.map((story) => ({ text: story.title, href: `/stories/${story.slug}/` })),
      },
    ],
    faqs: [
      {
        q: 'Is an AI receptionist worth it?',
        a: answer[0],
      },
      {
        q: 'What prices do the stories state?',
        a: priced.length
          ? priced.map((story) => `${story.business || story.title}: ${story.cost}`).join(' ')
          : 'No story states a price.',
        list: priced.map((story) => `${story.business || story.title}: ${story.cost}`),
      },
      {
        q: 'How many of these businesses stopped using the AI?',
        a: stopped.length
          ? `${stopped.length} stories record that callers pushed back and the business stopped the AI: ${stopped.map((story) => story.title).join('; ')}.`
          : 'None of the stories record that the business stopped.',
      },
    ],
    vendorSlugs: [...new Set(stories.map((story) => story.vendorSlug).filter(Boolean))],
    industries: [...new Set(stories.flatMap((story) => story.industries || []))],
    dollars: `${priced.map((story) => story.cost).join(' ')} ${answer.join(' ')}`,
    crumbs: [
      { name: 'Home', href: '/' },
      { name: 'Stories', href: '/stories/' },
      { name: 'Is it worth it?', href: '/worth-it/' },
    ],
  };
}


function missedCallPage({ stories }) {
  const slugs = [
    'ghaffari-eve-intake',
    'stg-divorce-lexidesk',
    'kent-heating-firm-90-day-test',
    'truchoice-roofing-after-hours-ai',
    'carolina-pines-allie',
    'la-dental-call-log',
    'red-dogs-roofing-stopped-ai',
    'home-services-review-roundup',
  ];
  const selected = slugs.map((slug) => stories.find((story) => story.slug === slug)).filter(Boolean);
  const rows = [
    [
      cell('Ghaffari Law Firm', { href: '/stories/ghaffari-eve-intake/' }),
      cell('Missed calls fell from about 20% to zero, per the case study. The first client from a warm transfer was signed within a day of turning that feature on.'),
      cell('Not stated'),
      cell('Vendor case study (Eve)'),
    ],
    [
      cell('STG Divorce Law, P.C.', { href: '/stories/stg-divorce-lexidesk/' }),
      cell('In the three months after Lexidesk, the missed-call rate went from 13.7% to 3.7%. The study also says the firm missed about 33 calls a month in July through September 2025, with a peak miss rate of 18.3% in September, and that by March 2026 the miss rate was 1.8%.'),
      cell('Not stated'),
      cell('Vendor case study (Lexidesk)'),
    ],
    [
      cell('Unnamed four-engineer heating firm in Kent, UK', { href: '/stories/kent-heating-firm-90-day-test/' }),
      cell('Over 90 days, 61 calls that would have gone unanswered were picked up: 43 became a booking on the call, 12 became callbacks closed within 24 hours, and 6 callers hung up once they realised it was not a person. The vendor is not named.'),
      cell('The author says the plan was £199 a month for up to 100 calls, then £1.20 per call, and the bill averaged £212 a month over three months.'),
      cell('Consultant post (Lilach Bullock)'),
    ],
    [
      cell('TruChoice Roofing', { href: '/stories/truchoice-roofing-after-hours-ai/' }),
      cell("The co-founder says an AI agent booked 26 sales appointments in 30 days from calls no one answered, and later added that most were after hours. He does not say how many closed, and he does not name the product."),
      cell('Not stated'),
      cell("Founder's posts on X"),
    ],
    [
      cell('Carolina Pines Dentistry, as told on a vendor podcast', { href: '/stories/carolina-pines-allie/' }),
      cell('The host says that over five months the team missed 28 new-patient calls and the agent scheduled 19 of them, and that one patient who scheduled through the agent paid for the platform for the year. The numbers are the host\'s, on a show that sells the agent. The product brand is not named.'),
      cell('The host says the AI agent is $299 a month.'),
      cell('Vendor podcast'),
    ],
    [
      cell('Unnamed LA-area dental office', { href: '/stories/la-dental-call-log/' }),
      cell('Of 637 calls where someone wanted something done, the AI completed 263 (41%), including 70 appointments booked. 709 of 1,432 logged calls were silent or hung up at the greeting. The vendor is not named. The author later built a competing product.'),
      cell('The author says the subscription was about $300 a month, or about $400 a month if staff time to return messages is counted, using his own assumption of 10 minutes per callback at $25 an hour.'),
      cell('Press (How Dentists Use AI)'),
    ],
    [
      cell("Red Dog's Roofing", { href: '/stories/red-dogs-roofing-stopped-ai/' }),
      cell('The CEO said customers did not give good feedback on an after-hours AI, so the company asked its answering service to stop using it. The service and product are not named.'),
      cell('Not stated'),
      cell('Press (RoofersCoffeeShop)'),
    ],
    [
      cell('Hire Bloom review of 125 comments', { href: '/stories/home-services-review-roundup/' }),
      cell('Of 10,938 Google reviews of HVAC, pest control, plumbing, electrical, and roofing companies, 125 mentioned an AI answering service, chatbot, or automated phone system. The article says 78% of those 125 were negative, 16% neutral, and 6% positive, and that every positive review described an after-hours booking that a person honored. Hire Bloom sells human agents.'),
      cell("The article's cost table gives a general range of $200 to $2,000 or more a month, or about $1 to $3 per resolution. That is not one vendor's bill, and it is not tied to a named company in the reviews."),
      cell('Review analysis (Hire Bloom)'),
    ],
  ];
  const answer = [
    'This page does not publish a typical cost of a missed call. The figures below are only what the sourced stories on this site already state.',
    'To estimate revenue lost at your own shop, enter four numbers on the missed-call calculator. That calculator uses no industry averages.',
    'Vendor-published case studies and a vendor podcast are labeled in the source column. Where a source states no price, the cell says "Not stated". Pound figures are left in pounds; they are not converted to dollars.',
  ];
  const faqs = [
    {
      q: 'What does a missed call cost?',
      a: 'This site does not publish a typical figure. The missed-call calculator uses only the four numbers you enter: calls per week, the share you miss, the share of those callers who would have become customers, and your average job value. No industry average is added.',
    },
    {
      q: 'What do the stories on this site say about missed calls?',
      a: 'Ghaffari Law Firm\'s vendor case study says missed calls fell from about 20% to zero. STG Divorce Law\'s vendor case study says the missed-call rate went from 13.7% to 3.7%. A consultant post about an unnamed Kent heating firm says 43 of 61 otherwise unanswered calls became bookings in 90 days, with 12 more closed as callbacks. TruChoice Roofing\'s co-founder says an AI agent booked 26 sales appointments in 30 days from unanswered calls. A vendor podcast about Carolina Pines says 19 of 28 missed new-patient calls were scheduled, at $299 a month. An LA-area dental write-up says the AI completed 41% of 637 calls that asked for something, at about $300 a month. Other stories record pushback: Red Dog\'s Roofing asked to turn the after-hours AI off, and a Hire Bloom review of 125 comments found 78% were negative.',
    },
    {
      q: 'Which of these stories state a price?',
      a: 'The Kent heating-firm post states £199 a month for up to 100 calls, then £1.20 per call, averaging £212 a month. The Carolina Pines podcast states $299 a month. The LA dental write-up states about $300 a month, or about $400 a month if staff callback time is counted at the author\'s assumption of 10 minutes per callback at $25 an hour. Hire Bloom\'s article gives a general range of $200 to $2,000 or more a month, or about $1 to $3 per resolution, not tied to a named company. The Ghaffari, STG Divorce Law, TruChoice Roofing, and Red Dog\'s Roofing stories state no price.',
    },
    {
      q: 'Are vendor-published stories labeled?',
      a: 'Yes. The Ghaffari and STG Divorce Law rows are vendor case studies, and the Carolina Pines row is a vendor podcast. Treat those figures as the publisher\'s. The Kent, TruChoice, LA dental, Red Dog\'s, and Hire Bloom rows are not vendor case studies on this site; the LA dental author later built a competing product, and Hire Bloom sells human agents.',
    },
  ];
  const dollars = [
    answer.join(' '),
    faqs.map((item) => item.a).join(' '),
    '$299',
    '$300',
    '$400',
    '$25',
    '$200',
    '$2,000',
    '$1',
    '$3',
  ].join(' ');
  return {
    summary: answer.slice(0, 2),
    verified: selected.map((story) => sourceDate(story)).filter(Boolean).sort().at(-1) || '',
    sources: selected.flatMap((story) => (story.sources || []).slice(0, 1).map((source) => ({ href: source.url, label: source.title || source.publisher || story.title }))),
    kind: 'missed-call',
    topic: 'missed-call',
    path: '/cost/missed-call/',
    phrase: 'cost of a missed call',
    title: 'Cost of a missed call, from sourced stories',
    h1: 'Cost of a missed call, from sourced stories',
    description: 'Sourced missed-call stories, with the figures each source states. No typical cost is invented. Use the calculator with your own numbers.',
    date: selected.map((story) => sourceDate(story)).filter(Boolean).sort().at(-1) || '',
    answer,
    blocks: [
      {
        type: 'table',
        caption: 'Figures copied from sourced stories already on this site. Vendor-published pieces are labeled. "Not stated" means the source gives no price.',
        headers: ['Story', 'What was reported', 'Price in the source', 'Source'],
        rows,
      },
      {
        type: 'list',
        heading: 'Work out your own number',
        items: [
          { text: 'Missed-call calculator, using only the four numbers you enter', href: '/missed-call-calculator/' },
          { text: 'Calculate your monthly bill, from published plans', href: '/cost/calculator/?calls=150&minutes=3' },
          { text: 'Free call coverage check of your public website and listings', href: AUDIT_PATH },
        ],
      },
    ],
    faqs,
    vendorSlugs: [...new Set(selected.map((story) => story.vendorSlug).filter(Boolean))],
    industries: [...new Set(selected.flatMap((story) => story.industries || []))],
    dollars,
    crumbs: [
      { name: 'Home', href: '/' },
      { name: 'Cost', href: '/cost/' },
      { name: 'Cost of a missed call', href: '/cost/missed-call/' },
    ],
  };
}

function relatedFor(page, pages) {
  const picks = [];
  const add = (href) => {
    if (!href || href === page.path || picks.includes(href)) return;
    picks.push(href);
  };
  add('/cost/');
  if (showAuditLinks()) add(AUDIT_PATH);
  add('/cost/missed-call/');
  add('/missed-call-calculator/');
  if (page.industries?.includes('dental')) add('/done-for-you/dental/');
  if (page.industries?.includes('legal')) add('/done-for-you/legal/');
  if (page.industries?.includes('plumbing')) add('/done-for-you/home-services/');
  if (page.industries?.includes('medical')) add('/done-for-you/med-spa/');
  for (const id of page.industries || []) add(INDUSTRY_COST[id]);
  const industryPath = { dental: '/industries/dental/', legal: '/industries/legal/', plumbing: '/industries/plumbing/', medical: '/industries/medical/' };
  const bestPath = { dental: '/best/dentists/', legal: '/best/law-firms/', plumbing: '/best/hvac-plumbing/', medical: '/best/med-spas/' };
  for (const id of page.industries || []) add(industryPath[id]);
  for (const id of page.industries || []) add(bestPath[id]);
  if (page.path === '/cost/home-services/' || page.path === '/cost/hvac-shop/') add('/compare/jobber-vs-housecall-pro/');
  if (page.path === '/cost/home-services/') add('/cost/hvac-shop/');
  if (page.path === '/cost/hvac-shop/') add('/cost/home-services/');
  if (page.industries?.includes('plumbing')) add('/best/roofing/');
  for (const other of pages) {
    if (other.kind === 'compare' && other.vendorSlugs?.some((slug) => page.vendorSlugs?.includes(slug))) add(other.path);
    if (other.kind === 'vendor-cost' && other.vendorSlugs?.some((slug) => page.vendorSlugs?.includes(slug))) add(other.path);
  }
  add('/cost/hidden-fees/');
  add('/worth-it/');
  add('/stories/');
  const labels = new Map(pages.map((item) => [item.path, item.h1]));
  labels.set('/cost/', 'Full cost calculator');
  labels.set('/stories/', 'Real stories');
  labels.set('/industries/dental/', 'Dental directory');
  labels.set('/industries/legal/', 'Legal directory');
  labels.set('/industries/plumbing/', 'Home services directory');
  labels.set('/industries/medical/', 'Medical directory');
  labels.set('/best/dentists/', 'Best AI receptionist for dentists');
  labels.set('/best/law-firms/', 'Best AI receptionist for law firms');
  labels.set('/best/med-spas/', 'Best AI receptionist for med spas');
  labels.set('/best/hvac-plumbing/', 'Best AI receptionist for HVAC and plumbing');
  labels.set('/best/veterinarians/', 'Best AI receptionist for veterinarians');
  labels.set('/best/roofing/', 'Best AI receptionist for roofing companies');
  labels.set('/best/chiropractors/', 'Best AI receptionist for chiropractors');
  labels.set('/best/property-management/', 'Best AI receptionist for property management');
  labels.set('/best/auto-repair/', 'Best AI receptionist for auto repair shops');
  labels.set('/best/salons/', 'Best AI receptionist for salons');
  labels.set('/cost/missed-call/', 'Cost of a missed call, from sourced stories');
  labels.set('/missed-call-calculator/', 'Missed-call calculator');
  if (showAuditLinks()) labels.set(AUDIT_PATH, 'Free call coverage check');
  labels.set('/done-for-you/dental/', 'Done-for-you dental setup');
  labels.set('/done-for-you/legal/', 'Done-for-you legal setup');
  labels.set('/done-for-you/home-services/', 'Done-for-you home services setup');
  labels.set('/done-for-you/med-spa/', 'Done-for-you med spa setup');
  return picks.slice(0, 10).map((href) => ({ href, label: labels.get(href) || href }));
}

export function buildLandings(data) {
  const models = data?.models || read('cost-models.json');
  const vendors = data?.vendors || read('vendors.json');
  const stories = data?.stories || read('stories.json');
  const pages = [
    industryPage({
      models, vendors, key: 'dental', path: '/cost/dental/',
      h1: 'AI receptionist cost for a dental office',
      phrase: 'ai receptionist for dental office',
      description: 'AI receptionist cost for a dental office at 50, 150, and 300 calls, from published Dialzara, Goodcall, and Smith.ai plans.',
      lede: 'For a dental office, this page prices only the plans whose own price pages say how much is included and what extra use costs. Everyone else stays in the starting-price table.',
    }),
    industryPage({
      models, vendors, key: 'legal', path: '/cost/legal/',
      h1: 'AI answering service cost for lawyers',
      phrase: 'ai answering service for lawyers',
      description: 'AI answering service cost for lawyers at 50, 150, and 300 calls, plus every legal starting price in the directory.',
      lede: 'For a law firm, the plans that publish how much is included are Dialzara, Goodcall, and Smith.ai, the same cards as the dental cost page. The starting-price table below is the legal directory, which is a different list.',
    }),
    industryPage({
      models, vendors, key: 'plumbing', path: '/cost/home-services/',
      h1: 'AI receptionist cost for home services',
      phrase: 'ai receptionist for home services',
      description: 'AI receptionist cost for home services at 50, 150, and 300 calls, from published Bland, Dialzara, Goodcall, and Smith.ai plans.',
      lede: 'Home services on this site are the plumbing listings, including HVAC and roofing tools filed there. The monthly figures use only plans that publish how much is included and what extra use costs.',
    }),
    industryPage({
      models, vendors, key: 'medical', path: '/cost/medical/',
      h1: 'AI receptionist cost for a medical office',
      phrase: 'ai receptionist for medical office',
      description: 'AI receptionist cost for a medical office at 50, 150, and 300 calls, from published Bland, ElevenLabs, and Goodcall plans.',
      lede: 'For a medical office, this page prices only the plans whose own price pages say how much is included and what extra use costs. A HIPAA line on the vendor page is not a price.',
    }),
    industryPage({
      models, vendors, key: 'plumbing', path: '/cost/hvac-shop/',
      h1: 'AI receptionist cost for a 3-tech HVAC shop',
      phrase: 'ai receptionist cost for a 3 tech hvac shop',
      description: 'AI receptionist cost for a 3-tech HVAC shop at 50, 150, and 300 calls, from the same published home-services plans. No typical shop volume is assumed.',
      lede: 'We do not have a published typical call volume for a 3-tech HVAC shop, so this page uses the same 50, 150, and 300 call examples as the home-services cost page, from the same published plans. Home services listings on this site, including HVAC, are filed under plumbing. Use the calculator with your own call count. A starting price is not a bill at those volumes.',
    }),
    vendorCostPage({
      models, slug: 'smith-ai', h1: 'Smith.ai cost per month', phrase: 'smith ai cost per month',
      description: 'Smith.ai cost per month at 50, 150, and 300 calls, from its published plans that charge by the call. Checked 6 November 2026.',
    }),
    vendorCostPage({
      models, slug: 'elevenlabs-ai-receptionist', h1: 'ElevenLabs AI receptionist pricing', phrase: 'elevenlabs ai receptionist pricing',
      description: 'ElevenLabs AI receptionist pricing at 50, 150, and 300 calls of 3 minutes. LLM and carrier charges are not included.',
    }),
    comparePage({
      models, vendors, pair: 'smith-ai-vs-ruby', slugs: ['smith-ai', 'ruby'],
      h1: 'Smith.ai vs Ruby', phrase: 'smith ai vs ruby',
      description: 'Smith.ai vs Ruby from sourced starting prices and Smith.ai call plans. Ruby lists minute bundles from $250/mo, with published extra-use rates.',
      scope: 'Smith.ai and Ruby are both in the directory. Ruby’s record is a human receptionist plan with an optional AI front end, and lists Call Ruby minute bundles from $250/mo, with published extra-use rates. Smith.ai’s record is an AI plan with live agents. Smith.ai is in our cost calculator; Ruby is not, so this page does not calculate a Ruby bill at 50, 150, or 300 calls.',
    }),
    comparePage({
      models, vendors, pair: 'bland-ai-vs-elevenlabs', slugs: ['bland-ai', 'elevenlabs-ai-receptionist'],
      h1: 'Bland AI vs ElevenLabs', phrase: 'bland ai vs elevenlabs',
      description: 'Bland AI vs ElevenLabs at 50, 150, and 300 calls of 3 minutes. Separate telephony and LLM charges are not added.',
      scope: 'Bland AI and ElevenLabs both publish minute-based agent pricing. The estimate assumes 3-minute calls. Telephony that Bland bills separately, and ElevenLabs LLM or carrier charges, are not added, because no single combined rate is printed.',
    }),
    comparePage({
      models, vendors, pair: 'goodcall-vs-rosie', slugs: ['goodcall', 'rosie'],
      h1: 'Goodcall vs Rosie', phrase: 'goodcall vs rosie',
      description: 'Goodcall vs Rosie from sourced starting prices. Goodcall charges per different caller, so a call count alone does not give a bill.',
      scope: 'Goodcall charges per different caller. Rosie publishes minute bundles. A call count is not turned into Goodcall customers, and Rosie is not in our cost calculator, so neither side gets a calculated 150-call bill.',
    }),
    comparePage({
      models, vendors, pair: 'jobber-vs-housecall-pro', slugs: ['jobber-ai-receptionist', 'housecall-pro-csr-ai'],
      h1: 'Jobber vs Housecall Pro AI receptionist cost', phrase: 'jobber vs housecall pro cost',
      description: 'Jobber vs Housecall Pro AI receptionist cost from the directory. Jobber publishes a $99/mo add-on. Housecall’s AI price is not verified.',
      scope: 'This page compares the AI receptionist line only. It is not a price for the rest of Jobber or Housecall Pro. Jobber publishes an AI Receptionist add-on at $99/mo for 100 conversations, then $0.79 each, on Core, Connect, and Grow, on top of a Jobber plan; it is included on Plus with unlimited conversations. Housecall Pro’s AI receptionist has no starting price in this directory.',
    }),
    comparePage({
      models, vendors, pair: 'smith-ai-vs-goodcall', slugs: ['smith-ai', 'goodcall'],
      h1: 'Smith.ai vs Goodcall', phrase: 'smith ai vs goodcall',
      description: 'Smith.ai vs Goodcall from sourced starting prices. Goodcall charges per different caller, so a call count alone does not give a Goodcall bill.',
      scope: 'Smith.ai and Goodcall are both in the directory and our cost calculator. Smith.ai records a free AI plan (25 calls), paid AI from $150/mo, and live agents from $300/mo, billed per call. Goodcall records Starter $79/mo for 100 unique customers, then 79¢ each. Goodcall charges per different caller, so a call count alone does not give a Goodcall bill.',
    }),
    comparePage({
      models, vendors, pair: 'rosie-vs-my-ai-front-desk', slugs: ['rosie', 'my-ai-front-desk'],
      h1: 'Rosie vs My AI Front Desk', phrase: 'rosie vs my ai front desk',
      description: 'Rosie vs My AI Front Desk from sourced starting prices. Neither is in our cost calculator, so no 150-call bill is calculated.',
      scope: 'Rosie and My AI Front Desk are both in the directory. Rosie publishes minute bundles, from $49/mo for 250 minutes, with booking and transfers from $149/mo. My AI Front Desk’s pricing page prints $99/mo, or $79/mo billed annually, including 200 voice minutes, and the medical page also prints $109/mo. Neither vendor is in our cost calculator, so this page does not calculate a bill at 50, 150, or 300 calls.',
    }),
    comparePage({
      models, vendors, pair: 'jobber-vs-servicetitan', slugs: ['jobber-ai-receptionist', 'servicetitan-ai-voice-agent'],
      h1: 'Jobber vs ServiceTitan AI receptionist', phrase: 'jobber vs servicetitan ai receptionist',
      description: 'Jobber vs ServiceTitan AI receptionist from the directory. Jobber publishes a $99/mo add-on. ServiceTitan’s AI price is not verified.',
      scope: 'This page compares the AI receptionist line only. It is not a price for the rest of Jobber or ServiceTitan. Jobber publishes an AI Receptionist add-on at $99/mo for 100 conversations, then $0.79 each, on Core, Connect, and Grow, on top of a Jobber plan; it is included on Plus with unlimited conversations. ServiceTitan’s AI Voice Agent has no starting price in this directory. Neither is in our cost calculator, so this page does not calculate a bill at 50, 150, or 300 calls.',
    }),
    comparePage({
      models, vendors, pair: 'oncrew-vs-nextphone', slugs: ['oncrew', 'nextphone'],
      h1: 'OnCrew vs NextPhone', phrase: 'oncrew vs nextphone',
      description: 'OnCrew vs NextPhone from sourced starting prices. Neither is in our cost calculator, so no 150-call bill is calculated.',
      scope: 'OnCrew and NextPhone are both in the home-services (plumbing) directory. OnCrew charges by the answered minute, with minutes included each month, starting at $49/mo with 250 minutes, then $0.49/min. NextPhone publishes a flat monthly starting price of $199/mo for unlimited inbound calls. Neither is in our cost calculator, so this page does not calculate a bill at 50, 150, or 300 calls.',
    }),
    hiddenFeesPage({ models, stories }),
    worthPage({ stories }),
    missedCallPage({ stories }),
  ];
  for (const page of pages) page.related = relatedFor(page, pages);
  return pages;
}

let cache;
export function getLandings() {
  if (!cache) cache = buildLandings();
  return cache;
}

export function linksForVendor(slug) {
  const vendor = read('vendors.json').find((item) => item.slug === slug);
  if (!vendor) return [];
  const pages = getLandings();
  const wanted = new Set();
  for (const id of vendor.industries || []) {
    if (INDUSTRY_COST[id]) wanted.add(INDUSTRY_COST[id]);
  }
  for (const page of pages) {
    if (page.vendorSlugs?.includes(slug)) wanted.add(page.path);
  }
  return pages.filter((page) => wanted.has(page.path)).map((page) => ({ href: page.path, label: page.h1 }));
}

export function linkForIndustry(key) {
  const href = INDUSTRY_COST[key];
  if (!href) return null;
  const page = getLandings().find((item) => item.path === href);
  return page ? { href, label: 'Cost at 50, 150, and 300 calls' } : null;
}

// Answer-first lines for the /cost/ hub, from every provider in the cost model.
export function costHubSummary(models = read('cost-models.json')) {
  const rows = planRows(models.providers);
  const names = models.providers.map((provider) => provider.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
  return [
    `${names.length} companies publish how much each plan includes and what extra use costs on their own price pages, so a monthly bill can be worked out: ${list}.${models.providers.some((p) => p.unit === 'customer') ? ` ${models.providers.filter((p) => p.unit === 'customer').map((p) => p.name).join(' and ')} charges per different caller, not per call.` : ''}`,
    `${rangeSentence(rows, 150).replace(' That is simple math on each company’s listed prices, not a ranking.', '')} Plans that charge by the minute assume ${ASSUMED_MINUTES}-minute calls, and the figures are simple math on each company’s listed prices, not a ranking.`,
  ];
}
