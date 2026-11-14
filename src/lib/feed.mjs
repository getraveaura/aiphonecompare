import { priceChangeHeadline } from './price-changes.mjs';

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  }[char]));
}

export function priceFeedItems(changes, site) {
  return (changes.changes || []).map((change) => ({
    title: priceChangeHeadline(change) || `${change.vendorSlug} price change`,
    link: `${site}/price-changes/${change.id}/`,
    date: change.observed,
    description: change.summary,
    category: 'Price change',
  }));
}

export function feedItems(stories, changes, site) {
  const storyItems = stories.map((story) => ({
    title: story.title,
    link: `${site}/stories/${story.slug}/`,
    date: (story.sources?.[0]?.date) || story.added,
    description: story.whatTheyDid,
    category: 'Story',
  }));
  return [...storyItems, ...priceFeedItems(changes, site)].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

function rssDocument({ title, link, description, updated, items }) {
  const body = items.map((item) => `  <item>
    <title>${esc(item.title)}</title>
    <link>${esc(item.link)}</link>
    <guid>${esc(item.link)}</guid>
    <pubDate>${esc(item.date)}</pubDate>
    <category>${esc(item.category)}</category>
    <description>${esc(item.description)}</description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(title)}</title>
  <link>${esc(link)}</link>
  <description>${esc(description)}</description>
  <lastBuildDate>${esc(updated)}</lastBuildDate>
${body}
</channel>
</rss>
`;
}

export function renderPriceFeed({ changes, site, updated }) {
  const items = priceFeedItems(changes, site).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return rssDocument({
    title: 'aiphonecompare price changes',
    link: `${site}/price-changes/`,
    description: 'Logged changes to published AI receptionist prices. A change is logged only when two public sources disagree.',
    updated,
    items,
  });
}

export function renderFeed({ stories, changes, site, updated }) {
  return rssDocument({
    title: 'aiphonecompare stories and price changes',
    link: `${site}/`,
    description: 'Sourced stories about AI receptionists, and logged changes to published prices.',
    updated,
    items: feedItems(stories, changes, site),
  });
}
