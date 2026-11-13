// Landing pages for searches the directory can answer from sourced records.
// A missing price stays missing. Call count is never turned into unique callers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimatePlan, formatUsd } from './cost.mjs';
import { formatDate, industryLabel, sourceDate } from './stories.mjs';
import { compareSummary, vendorCostSummary, sourceLinks } from './answers.mjs';
import { outboundLink } from './outbound.mjs';

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

function cell(text, extra = {}) {
  return { text: text || 'Not verified', ...extra };
}

function oneTime(plan) {
  if (plan.setupFee == null) return 'Not verified';
  if (plan.setupFee === 0) return 'No setup fee on the pricing page';
  return `${formatUsd(Math.round(plan.setupFee * 100))} one time`;
}

function scenarioText(provider, estimate) {
  if (provider.unit === 'customer') {
    return 'Not estimated. Unique callers are not converted from call count.';
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
  return `At ${label}, the complete estimates run from ${lowText} to ${high.estimates[calls].text} for ${high.provider} ${high.plan}. That is the math on the published cards, not a ranking.`;
}

function scenarioTable(rows, caption) {
  return {
    type: 'table',
    caption,
    headers: ['Provider', 'Plan', '50 calls', '150 calls', '300 calls', 'One-time', 'Published price'],
    rows: rows.map((row) => [
      cell(row.provider, { href: `/vendors/${row.slug}/` }),
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
    headers: ['Vendor', 'Starting price', 'Billing', 'Price checked', 'Source'],
    rows: rows.map((vendor) => [
      cell(vendor.name, { href: `/vendors/${vendor.slug}/` }),
      cell(vendor.starting_price),
      cell(vendor.billing_model),
      cell(vendor.last_checked ? formatDate(vendor.last_checked) : 'Not verified', vendor.last_checked ? { datetime: vendor.last_checked } : {}),
      vendor.sources?.[0]
        ? cell('Price source', { href: vendor.sources[0], external: true })
        : cell('Not verified'),
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
    `The monthly figures below use the cost model checked ${formatDate(models.checked)}. Minute-billed plans use a ${ASSUMED_MINUTES}-minute average call, which is an assumption, not a number from the pricing page. Per-call plans ignore length. One-time fees stay in their own column.`,
    `Providers with enough published math in this industry: ${names}.`,
    customer.length ? `${customer.join(' and ')} bills unique callers, so those rows are listed and not estimated from call count.` : '',
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
      a: 'No. The span of complete estimates is the math on the published cards at one call count. Rows are alphabetical. Rankings are not for sale, and a sponsored listing does not change these figures.',
    },
  ];
  const summary = [
    rangeSentence(rows, 150).replace(' That is the math on the published cards, not a ranking.', ' That is the math on the published plan cards, not a ranking.'),
    `Minute plans assume a ${ASSUMED_MINUTES}-minute call; one-time fees are listed separately.`,
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
      scenarioTable(rows, `Monthly scenario at 50, 150, and 300 calls. Minute plans assume a ${ASSUMED_MINUTES}-minute call. Checked ${formatDate(models.checked)}.`),
      caveatBlock(providers),
      startingTable(vendors, key),
    ],
    faqs,
    vendorSlugs: providers.map((provider) => provider.slug),
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
    `${provider.name} publishes the plan cards below. This page runs those cards at 50, 150, and 300 calls a month. The cost model was checked ${formatDate(models.checked)}.`,
    provider.unit === 'minute'
      ? `The minute plans use a ${ASSUMED_MINUTES}-minute average call. That length is an assumption. Partial minutes are not rounded up.`
      : provider.unit === 'call'
        ? 'These plans bill per call. The call length does not change the figure.'
        : 'These plans bill unique callers. A call count is not converted into customers, so the monthly cells stay unestimated.',
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
          `Scenario rows use the cost model checked ${formatDate(models.checked)}, at 50, 150, and 300 calls.`,
          providers.some((provider) => provider.unit === 'minute') ? `Minute plans use a ${ASSUMED_MINUTES}-minute average call.` : '',
          'A vendor with no cost model has no scenario row.',
        ].filter(Boolean).join(' ')
      : 'Neither vendor is in the cost model, so this page does not calculate a bill at 50, 150, or 300 calls.',
    rows.length ? rangeSentence(rows, 150) : '',
  ].filter(Boolean);
  const fields = [
    ['Starting price', (vendor) => blank(vendor.starting_price)],
    ['Billing model', (vendor) => blank(vendor.billing_model)],
    ['Free trial', (vendor) => blank(vendor.free_trial)],
    ['Human handoff', (vendor) => blank(vendor.human_handoff)],
    ['HIPAA / BAA', (vendor) => blank(vendor.hipaa_baa)],
    ['Industries', (vendor) => (vendor.industries || []).map((id) => industryLabel(id)).join(', ') || 'Not verified'],
    ['Notes', (vendor) => blank(vendor.notes)],
    ['Price checked', (vendor) => (vendor.last_checked ? formatDate(vendor.last_checked) : 'Not verified')],
  ];
  const attributeRows = fields.map(([label, readField]) => [
    cell(label),
    ...selected.map((vendor) => cell(readField(vendor), label === 'Price checked' && vendor.last_checked ? { datetime: vendor.last_checked } : {})),
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
        a: rows.length ? rangeSentence(rows, 150) : 'No. Neither pricing record publishes the allowance and overage this calculator needs, so no 150-call bill is calculated.',
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
        q: `Will ${left.name} or ${right.name} sign a HIPAA BAA?`,
        a: `${left.name}: ${left.hipaa_baa ? left.hipaa_baa : 'Not stated'}. ${right.name}: ${right.hipaa_baa ? right.hipaa_baa : 'Not stated'}. A "HIPAA compliant" line is not a signed BAA, so ask for the agreement in writing.`.replace(/\.\./g, '.'),
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
      cell(row.provider, { href: `/vendors/${row.slug}/` }),
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
      ? `Printed one-time fees in the cost model, checked ${formatDate(models.checked)}: ${printed.map((row) => `${row.provider} ${row.plan}, ${row.oneTime}`).join('; ')}.`
      : `No plan in the cost model, checked ${formatDate(models.checked)}, prints a dollar setup fee.`,
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
        caption: `One-time fee column from each published plan in the cost model. Checked ${formatDate(models.checked)}.`,
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
          : 'None of the plans in the cost model print a dollar setup fee.',
      },
      {
        q: 'Are unpublished fees treated as free?',
        a: 'No. "Not verified" means the pricing page we checked does not print that fee. It is left out of the monthly scenario rather than added as zero.',
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

function relatedFor(page, pages) {
  const picks = [];
  const add = (href) => {
    if (!href || href === page.path || picks.includes(href)) return;
    picks.push(href);
  };
  add('/cost/');
  for (const id of page.industries || []) add(INDUSTRY_COST[id]);
  const industryPath = { dental: '/industries/dental/', legal: '/industries/legal/', plumbing: '/industries/plumbing/', medical: '/industries/medical/' };
  for (const id of page.industries || []) add(industryPath[id]);
  if (page.path === '/cost/home-services/') add('/compare/jobber-vs-housecall-pro/');
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
  return picks.slice(0, 8).map((href) => ({ href, label: labels.get(href) || href }));
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
      lede: 'For a dental office, this page prices only the plans whose own pricing pages publish the allowance and the overage. Everyone else stays in the starting-price table.',
    }),
    industryPage({
      models, vendors, key: 'legal', path: '/cost/legal/',
      h1: 'AI answering service cost for lawyers',
      phrase: 'ai answering service for lawyers',
      description: 'AI answering service cost for lawyers at 50, 150, and 300 calls, plus every legal starting price in the directory.',
      lede: 'For a law firm, the plans with published allowances are Dialzara, Goodcall, and Smith.ai, the same cards as the dental cost page. The starting-price table below is the legal directory, which is a different list.',
    }),
    industryPage({
      models, vendors, key: 'plumbing', path: '/cost/home-services/',
      h1: 'AI receptionist cost for home services',
      phrase: 'ai receptionist for home services',
      description: 'AI receptionist cost for home services at 50, 150, and 300 calls, from published Bland, Dialzara, Goodcall, and Smith.ai plans.',
      lede: 'Home services on this site are the plumbing listings, including HVAC and roofing tools filed there. The monthly figures use only plans that publish an allowance and an overage.',
    }),
    industryPage({
      models, vendors, key: 'medical', path: '/cost/medical/',
      h1: 'AI receptionist cost for a medical office',
      phrase: 'ai receptionist for medical office',
      description: 'AI receptionist cost for a medical office at 50, 150, and 300 calls, from published Bland, ElevenLabs, and Goodcall plans.',
      lede: 'For a medical office, this page prices only the plans whose own pricing pages publish the allowance and the overage. A HIPAA line on the vendor page is not a price.',
    }),
    vendorCostPage({
      models, slug: 'smith-ai', h1: 'Smith.ai cost per month', phrase: 'smith ai cost per month',
      description: 'Smith.ai cost per month at 50, 150, and 300 calls, from the published per-call plans. Checked 6 November 2026.',
    }),
    vendorCostPage({
      models, slug: 'elevenlabs-ai-receptionist', h1: 'ElevenLabs AI receptionist pricing', phrase: 'elevenlabs ai receptionist pricing',
      description: 'ElevenLabs AI receptionist pricing at 50, 150, and 300 calls of 3 minutes. LLM and carrier charges are not included.',
    }),
    comparePage({
      models, vendors, pair: 'smith-ai-vs-ruby', slugs: ['smith-ai', 'ruby'],
      h1: 'Smith.ai vs Ruby', phrase: 'smith ai vs ruby',
      description: 'Smith.ai vs Ruby from sourced starting prices and Smith.ai per-call plans. Ruby stops at its published starting bundle.',
      scope: 'Smith.ai and Ruby are both in the directory. Ruby’s record is a human receptionist plan with an optional AI front end. Smith.ai’s record is an AI plan with live agents. This page stops at Ruby’s published starting bundle.',
    }),
    comparePage({
      models, vendors, pair: 'bland-ai-vs-elevenlabs', slugs: ['bland-ai', 'elevenlabs-ai-receptionist'],
      h1: 'Bland AI vs ElevenLabs', phrase: 'bland ai vs elevenlabs',
      description: 'Bland AI vs ElevenLabs at 50, 150, and 300 calls of 3 minutes. Separate telephony and LLM charges are not added.',
      scope: 'Bland AI and ElevenLabs both publish minute-based agent pricing. The scenario uses a 3-minute average call. Telephony that Bland bills separately, and ElevenLabs LLM or carrier charges, are not added, because no single combined rate is printed.',
    }),
    comparePage({
      models, vendors, pair: 'goodcall-vs-rosie', slugs: ['goodcall', 'rosie'],
      h1: 'Goodcall vs Rosie', phrase: 'goodcall vs rosie',
      description: 'Goodcall vs Rosie from sourced starting prices. Goodcall bills unique callers, so a call count is not a bill.',
      scope: 'Goodcall bills unique callers. Rosie publishes minute bundles. A call count is not turned into Goodcall customers, and Rosie is not in the cost model, so neither side gets a calculated 150-call bill.',
    }),
    comparePage({
      models, vendors, pair: 'jobber-vs-housecall-pro', slugs: ['jobber-ai-receptionist', 'housecall-pro-csr-ai'],
      h1: 'Jobber vs Housecall Pro AI receptionist cost', phrase: 'jobber vs housecall pro cost',
      description: 'Jobber vs Housecall Pro AI receptionist cost from the directory. Jobber publishes an add-on price. Housecall’s AI price is not verified.',
      scope: 'This page compares the AI receptionist line only. It is not a price for the rest of Jobber or Housecall Pro. Housecall Pro’s AI receptionist has no starting price in this directory.',
    }),
    hiddenFeesPage({ models, stories }),
    worthPage({ stories }),
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
    `${names.length} providers publish plan allowances and overage rates on their own pricing pages, so a monthly bill can be worked out: ${list}.${models.providers.some((p) => p.unit === 'customer') ? ` ${models.providers.filter((p) => p.unit === 'customer').map((p) => p.name).join(' and ')} bills unique callers, not calls.` : ''}`,
    `${rangeSentence(rows, 150).replace(' That is the math on the published cards, not a ranking.', '')} Minute plans assume a ${ASSUMED_MINUTES}-minute call, and the figures are math on the published plan cards, not a ranking.`,
  ];
}
