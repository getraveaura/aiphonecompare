// FAQ for /cost/. Every answer repeats sentences already visible on that page
// (the lead and the method paragraph), so the FAQPage JSON-LD stays truthful
// without a new visible block. No dollar amounts on purpose.
export function costFaqs(checkedLabel) {
  return [
    { q: 'How do you estimate a monthly bill?', a: "Type in how many calls you get. We show your estimated monthly bill only where the company's own price page says what it charges for (calls or minutes), how much is included and what extra use costs. A starting price is often not what you'd really pay." },
    { q: 'Which companies are included in these estimates?', a: `These are the companies whose own websites, checked ${checkedLabel}, publish enough prices to do this math. The others are in the starting-price list.` },
    { q: 'Are the estimates sorted by price or marked cheapest?', a: 'Nothing here is sorted by price, and nothing is marked cheapest. Taxes and add-ons that are not listed are not included.' },
  ];
}
