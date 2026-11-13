// FAQ for /cost/. Every answer repeats sentences already visible on that page
// (the lead and the method paragraph), so the FAQPage JSON-LD stays truthful
// without a new visible block. No dollar amounts on purpose.
export function costFaqs(checkedLabel) {
  return [
    { q: 'How do you estimate a monthly bill?', a: "Enter your own call volume. The rows turn that into a monthly scenario only where the provider's pricing page publishes the unit, the allowance, and the overage. A starting price is not the same as this bill." },
    { q: 'Which providers are included in these estimates?', a: `These providers are the ones whose own sites, checked ${checkedLabel}, publish enough to do this math. The other vendors stay in the starting-price directory.` },
    { q: 'Are the estimates sorted by price or marked cheapest?', a: 'Nothing here is sorted by price, and nothing is marked cheapest. Taxes and add-ons that are not printed are not included.' },
  ];
}
