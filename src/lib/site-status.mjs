// A vendor whose own website is down when we check. The listing stays (never
// deleted); it is labeled and left out of match suggestions.
import { formatDate } from './stories.mjs';
export function siteOffline(vendor) {
  return vendor?.site_status?.status === 'offline';
}
export function offlineLabel(vendor) {
  return siteOffline(vendor) ? `Site offline as of ${formatDate(vendor.site_status.since).replace(/ (\w{3})\w* /, ' $1 ')}` : '';
}
