// FAQ and question headings for /cost/. Answers are 40–60 words and use only
// figures the cost engine and the directory already computed.
import { marketFindings } from './quotable.mjs';
import { money } from './starting-price.mjs';
import { formatDate } from './stories.mjs';

export function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function costFaqs(models, market = marketFindings()) {
  const date = formatDate(models.checked);
  return [
    {
      id: 'monthly-cost',
      q: 'How much does an AI receptionist cost per month?',
      a: `Half of the ${market.counted} services with a standard monthly price start at ${money(market.median)} a month or less, and ${market.under50} start at $50 or less. A starting price is often lower than the bill, because extra minutes or calls cost more. The table prices 150 calls of 3 minutes from each company's pricing page.`,
    },
    {
      id: 'call-volumes',
      q: 'What will I pay at 50, 150, and 300 calls a month?',
      a: `The table shows 50, 150, and 300 calls. If the calls fit inside the plan, the cell is the price on the company's page. If they don't, the cell says our calculation: the plan price plus the company's listed rate for extra minutes or calls. The line above the table says how we treat minutes, tax, and fees.`,
    },
    {
      id: 'starting-price',
      q: 'Why is the starting price often not my real bill?',
      a: `A starting price is the lowest price on the company's website. Your bill depends on how they charge, how much use is included, and what extra use costs. A low start can still mean you pay for minutes, calls, or credits past the allowance. Check what's included before you compare two prices.`,
    },
    {
      id: 'how-billing-works',
      q: 'How do these services bill (minutes, calls, callers)?',
      a: `Ready-made AI receptionists bill in three main ways: by the minute, by the call, or by the unique caller. A minute plan cares how long you talk. A call plan charges the same for a short call and a long one. A unique-caller plan, such as Goodcall, charges once per person in a month.`,
    },
    {
      id: 'setup-cost',
      q: 'What does setup cost?',
      a: `Some companies list a one-time setup fee, and some say there is none. We show a fee only when the pricing page lists it. If a company doesn't list a fee, we leave it blank instead of guessing $0. AgentZap lists a $499 setup fee. Dialzara's pricing page says there is no setup fee.`,
    },
    {
      id: 'small-business',
      q: 'What does an AI receptionist cost for a small business?',
      a: `Use the 50-call and 150-call columns, not one invented typical bill. A quieter shop is closer to 50 calls. A busier front desk is closer to 150 calls of 3 minutes. A starting price is often lower than the bill. Starting prices are on the small-business and under-$100 pages.`,
    },
    {
      id: 'vs-live',
      q: 'Is an AI receptionist cheaper than a live receptionist?',
      a: `An AI receptionist usually costs less than a live receptionist at the same call count, and they are different products. Ruby is a human receptionist service with an optional AI front end. The AI versus live receptionist page has sourced totals for both at 50, 150, and 300 calls.`,
    },
    {
      id: 'missing-fees',
      q: 'Which fees are often missing from the advertised price?',
      a: `Advertised prices often leave out setup, extra minutes or calls, a phone number, texting, and a separate software plan. We add a charge only when the pricing page lists it. If a company doesn't list a fee, we leave it blank instead of guessing $0. The hidden-fees page lists the setup lines we could verify.`,
    },
  ].map((item) => ({ ...item, words: wordCount(item.a), checkedLabel: date }));
}
