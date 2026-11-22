// FAQ and question headings for /cost/. Answers are 40–60 words and use only
// figures the cost engine and the directory already computed.
import { marketFindings, usdCents } from './quotable.mjs';
import { readyRange } from './cost-table.mjs';
import { money } from './starting-price.mjs';
import { formatDate } from './stories.mjs';

export function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function costFaqs(models, market = marketFindings()) {
  const range = readyRange(models, 150);
  const low = range ? usdCents(range.lowCents) : '';
  const high = range ? usdCents(range.highCents) : '';
  const date = formatDate(models.checked);
  return [
    {
      id: 'monthly-cost',
      q: 'How much does an AI receptionist cost per month?',
      a: `Half of the ${market.counted} services that publish a standard monthly price start at ${money(market.median)} a month or less. At 150 calls of 3 minutes, ready-made plans we fully priced on ${date} run from ${low} to ${high} a month. A starting price is often not the bill. Live receptionist plans are not in that range.`,
    },
    {
      id: 'call-volumes',
      q: 'What will I pay at 50, 150, and 300 calls a month?',
      a: `The table uses 3-minute calls, monthly billing, and the cheapest complete published plan for each company. If the calls fit inside that plan, the cell is the printed monthly price. If they do not, it is our calculation from the printed price, included use, and extra-use rate. Tax and unpublished fees are left blank. They are not zero.`,
    },
    {
      id: 'starting-price',
      q: 'Why is the starting price often not my real bill?',
      a: `A starting price is the cheapest plan on the company's website. The bill depends on how they charge, how much use is included, and what extra use costs. A low starting price can still leave you paying for minutes, calls, or credits past the allowance. Read what is included before you compare two prices.`,
    },
    {
      id: 'how-billing-works',
      q: 'How do these services bill (minutes, calls, callers)?',
      a: `Ready-made AI receptionists bill in three main ways: by the minute, by the call, or by the unique caller. A minute plan cares how long you talk. A call plan charges the same for a short call and a long one. A unique-caller plan charges once per person in a month. The table names which way each company uses.`,
    },
    {
      id: 'setup-cost',
      q: 'What does setup cost?',
      a: `Some companies print a one-time setup fee, some say they charge none, and some do not say. We list a fee only when the pricing page prints it. If the page is silent, we write "not published" and do not treat it as zero. AgentZap prints a $499 setup fee. Dialzara's pricing page says there is no setup fee.`,
    },
    {
      id: 'small-business',
      q: 'What does an AI receptionist cost for a small business?',
      a: `Use the 50-call and 150-call columns, not one invented typical bill. A quieter shop is closer to 50 calls. A busier front desk is closer to 150 calls of 3 minutes. At 150 calls, ready-made plans we can fully price run from ${low} to ${high}. Starting prices are on the small-business and under-$100 pages.`,
    },
    {
      id: 'vs-live',
      q: 'Is an AI receptionist cheaper than a live receptionist?',
      a: `An AI receptionist usually costs less than a live receptionist at the same call count, and they are different products. This page keeps live plans out of the AI range. Ruby is a human receptionist service with an optional AI front end. Sourced totals for both, at 50, 150, and 300 calls, are on the AI versus live receptionist page.`,
    },
    {
      id: 'missing-fees',
      q: 'Which fees are often missing from the advertised price?',
      a: `Advertised prices often leave out setup, extra minutes or calls, a phone number, texting, and a separate software plan. We add a charge only when the pricing page prints it. A missing fee stays "not published." It is not zero. The hidden-fees page lists the setup lines we could verify, with the same sources.`,
    },
  ].map((item) => ({ ...item, words: wordCount(item.a), checkedLabel: date }));
}
