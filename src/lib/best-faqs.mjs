// Question answers for /best/ai-phone-receptionists/. 40–60 words, no scores.
import { wordCount } from './cost-faq.mjs';

const date = '22 November 2026';

export function bestFaqs() {
  return [
    {
      id: 'small-business',
      q: 'What is the best AI phone receptionist for a small business?',
      a: `There is no single winner. A shop with a few short calls, a practice whose customers call back, and a firm that needs a person on the line will not want the same plan. Use the situation that matches the call, then confirm the bill on the cost page. Checked ${date}.`,
    },
    {
      id: 'how-we-chose',
      q: 'How did we choose the tools on this page?',
      a: 'We started with ready-made AI receptionists this site already lists and whose pricing page we could read. No company can pay to move up. We have not test-called every product. A small set of public demo lines was called on 19 November 2026, and that is all. Sponsored spots, if any, are labeled and do not change this order.',
    },
    {
      id: 'cost',
      q: 'How much do the best AI phone receptionists cost?',
      a: `Starting prices are not a quote. At 150 calls of 3 minutes, ready-made plans we can fully price run from $99 to $449 a month, checked ${date}. That range leaves out live receptionists, software add-ons, and platforms you build. The cost page shows the worked table, and the calculator takes your own volume.`,
    },
    {
      id: 'lowest-price',
      q: 'Which one fits if I want the lowest published starting price?',
      a: 'Start with the under-$50 and under-$100 lists, which sort by the price each company prints. Upfirst prints $24.95 a month for 30 calls, and Dialzara prints $29 a month for 60 minutes. A low start still leaves extra-use charges. Read what is included, then run your volume on the cost page.',
    },
    {
      id: 'repeat-callers',
      q: 'Which one fits if the same customers call back often?',
      a: `Goodcall bills unique callers: one phone number, once a month. Its page, checked ${date}, lists Starter at $79 for 100 unique customers and says that is about 150 calls. We do not turn calls into customers. If the same people call back, that billing unit can fit better than a per-minute plan. Confirm it on Goodcall's page.`,
    },
    {
      id: 'human',
      q: 'Which one fits if I need a person who can take over?',
      a: 'Smith.ai can transfer a call to a live receptionist. Abby Connect is a hybrid of people and AI. Ruby is a human receptionist service with an optional AI front end, and it is not an AI plan. Compare those on the live-versus-AI cost page and on Smith.ai versus Ruby. A transfer fee that is not printed stays not published.',
    },
    {
      id: 'industry',
      q: 'Which one fits my industry?',
      a: 'Use the industry guide for your work. Dentists, law firms, HVAC and plumbing, and the other guides list only the tools this site already records for that field. This page does not rebuild those lists. Jobber\'s AI receptionist is an add-on to Jobber, not a receptionist you buy on its own. Housecall Pro\'s AI price is not published here.',
    },
    {
      id: 'answering-service',
      q: 'Is an AI phone receptionist the same as an answering service?',
      a: 'An AI phone receptionist is software that answers the call. A traditional answering service uses people. Some companies sell both, or a mix, and say so on the pricing page. Ruby is the human-first example on this site. The live-versus-AI page compares sourced monthly totals. The name on the ad is not the product.',
    },
  ].map((item) => ({ ...item, words: wordCount(item.a) }));
}
