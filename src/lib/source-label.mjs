export function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Source'; }
}

export function shortDay(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}
