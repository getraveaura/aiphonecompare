// Launch gating for pages that build before they are ready to be found.
// A page that is not live is noindex,nofollow (so postbuild leaves it out of
// sitemap.xml and the IndexNow payload), stays out of llms.txt, and no other
// page renders a link to it.

export const HIDDEN_ROBOTS = 'noindex,nofollow';

// Value for Base's `robots` prop: undefined (indexable) when live.
export function robotsFor(live) {
  return live === true ? undefined : HIDDEN_ROBOTS;
}

// Whether other pages may render links to the page.
export function linksVisible(live) {
  return live === true;
}
