function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  }[char]));
}

export function feedItems(stories, changes, site) {
  const storyItems = stories.map((story) => ({
    title: story.title,
    link: `${site}/stories/${story.slug}/`,
    date: (story.sources?.[0]?.date) || story.added,
    description: story.whatTheyDid,
    category: 'Story',
  }));
  const priceItems = (changes.changes || []).map((change) => ({
    title: `${change.vendorSlug} price change`,
    link: `${site}/price-changes/${change.id}/`,
    date: change.observed,
    description: change.summary,
    category: 'Price change',
  }));
  return [...storyItems, ...priceItems].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function renderFeed({ stories, changes, site, updated }) {
  const items = feedItems(stories, changes, site);
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
  <title>aiphonecompare stories and price changes</title>
  <link>${esc(site)}/</link>
  <description>Sourced stories about AI receptionists, and logged changes to published prices.</description>
  <lastBuildDate>${esc(updated)}</lastBuildDate>
${body}
</channel>
</rss>
`;
}
