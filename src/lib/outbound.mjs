// One place decides where a "visit vendor" link points.
// A vendor with a referral_url gets that link, marked rel="sponsored".
// Everyone else gets their website. Price source links never use this:
// they always point at the real source (vendor.sources).

export const REFERRAL_NOTE = 'Referral link: we may earn a fee if you sign up. It never affects rankings or prices.';

export function outboundLink(vendor) {
  const referral = typeof vendor?.referral_url === 'string' ? vendor.referral_url.trim() : '';
  if (referral) return { href: referral, rel: 'sponsored noopener', isReferral: true };
  const website = typeof vendor?.website === 'string' ? vendor.website.trim() : '';
  if (website) return { href: website, rel: 'nofollow noopener', isReferral: false };
  return null;
}
