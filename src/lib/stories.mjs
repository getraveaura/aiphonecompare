export const INDUSTRIES = [
  ['dental', 'Dental', '/industries/dental/'],
  ['medical', 'Medical', '/industries/medical/'],
  ['legal', 'Legal', '/industries/legal/'],
  ['plumbing', 'Plumbing', '/industries/plumbing/'],
  ['hvac', 'HVAC', ''],
  ['roofing', 'Roofing', ''],
  ['other', 'Other', ''],
];

const LABEL = Object.fromEntries(INDUSTRIES.map(([id, label]) => [id, label]));
const HREF = Object.fromEntries(INDUSTRIES.map(([id, , href]) => [id, href]));

export function industryLabel(id) {
  return LABEL[id] || id;
}

export function industryHref(id) {
  return HREF[id] || '';
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function sourceDate(item) {
  const dates = (item.sources || []).map((source) => source.date).filter(Boolean).sort();
  return dates[0] || item.observed || item.added || '';
}

export function addedOnOrAfter(iso, startIso) {
  if (!iso || !startIso) return false;
  return iso >= startIso;
}

export function weekStart(todayIso) {
  const end = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(end)) return todayIso;
  return new Date(end - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addedThisWeek(items, todayIso) {
  const start = weekStart(todayIso);
  return items.filter((item) => addedOnOrAfter(item.added, start) && item.added <= todayIso);
}

function catchSources(story) {
  const fromCatches = (story.catches || []).flatMap((item) => item.sources || []);
  return fromCatches.length ? fromCatches : (story.sources || []);
}

export function catchGroups(stories, { industry, vendorSlug } = {}) {
  const groups = new Map();
  for (const story of stories) {
    if (vendorSlug && story.vendorSlug !== vendorSlug) continue;
    if (industry && !(story.industries || []).includes(industry)) continue;
    for (const item of story.catches || []) {
      const scope = item.industries;
      if (industry && Array.isArray(scope) && !scope.includes(industry)) continue;
      if (!groups.has(item.id)) {
        groups.set(item.id, { id: item.id, label: item.label, sources: [] });
      }
      const group = groups.get(item.id);
      for (const source of item.sources || []) {
        if (!group.sources.some((existing) => existing.url === source.url)) {
          group.sources.push({
            ...source,
            storySlug: story.slug,
            storyTitle: story.title,
            summary: item.summary,
          });
        }
      }
    }
  }
  return [...groups.values()]
    .filter((group) => group.sources.length > 1)
    .sort((a, b) => b.sources.length - a.sources.length || a.label.localeCompare(b.label));
}

export function byEvidence(stories) {
  return [...stories].sort((a, b) => {
    const rank = (story) => (story.evidence === 'independent' ? 0 : 1);
    const evidence = rank(a) - rank(b);
    if (evidence) return evidence;
    return sourceDate(b).localeCompare(sourceDate(a)) || (a.title || '').localeCompare(b.title || '');
  });
}

export function storiesForIndustry(stories, industry) {
  return byEvidence(stories.filter((story) => (story.industries || []).includes(industry)));
}

export function storiesForVendor(stories, slug) {
  return stories.filter((story) => story.vendorSlug === slug);
}

export function latestByAdded(items, limit) {
  return [...items].sort((a, b) => (b.added || '').localeCompare(a.added || '') || sourceDate(b).localeCompare(sourceDate(a)) || a.title.localeCompare(b.title || '')).slice(0, limit);
}

export { catchSources };
