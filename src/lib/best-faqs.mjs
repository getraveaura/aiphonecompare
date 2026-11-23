// Question answers for /best/ai-phone-receptionists/. No scores.
import models from '../data/cost-models.json' with { type: 'json' };
import { wordCount } from './cost-faq.mjs';
import { readyRange } from './cost-table.mjs';
import { formatDate } from './stories.mjs';

const date = formatDate(models.checked);
const range = readyRange(models, 150);

export function bestFaqs() {
  return [
    {
      id: 'small-business',
      q: 'What is the best AI phone receptionist for a small business?',
      a: `There is no single winner. A shop with a few short calls, a practice whose customers call back, and a firm that needs a person on the line will want different plans. Pick the situation that matches the call, then confirm the bill on the cost page. Prices were checked ${date}.`,
    },
    {
      id: 'how-we-chose',
      q: 'How did we choose the tools on this page?',
      a: 'We started with ready-made AI receptionists this site already lists and whose pricing page we could read. We have not test-called every product. A small set of public demo lines was called on 19 November 2026, and that is all. Sponsored spots, if any, are labeled and do not change this order.',
    },
    {
      id: 'cost',
      q: 'How much do the best AI phone receptionists cost?',
      a: `Prices come straight from each company's pricing page. A starting price is not your bill. At 150 calls of 3 minutes, ready-made plans with full public pricing run from ${range.prose} a month, checked ${date}. That range leaves out live receptionists, software add-ons, and platforms you build. The cost page has the full table.`,
    },
    {
      id: 'lowest-price',
      q: 'Which one fits if I want the lowest starting price?',
      a: `Start with the under-$50 and under-$100 lists. Those lists run from the cheapest start. Upfirst's Starter is $24.95 a month for 30 calls, then $1.50 a call, on upfirst.ai/pricing, checked ${date}. Dialzara's Business Lite is $29 a month for 60 minutes, on dialzara.com/pricing. Several others list $49 a month, including OnCrew, Rosie, and Zinng.ai. A starting price is not the bill at 150 calls. Use the cost page before you decide.`,
    },
    {
      id: 'repeat-callers',
      q: 'Which one fits if the same customers call back often?',
      a: `Goodcall counts each caller once a month, however many times they call. Starter is $79 a month for 100 unique customers, then 79 cents, and the page says that is about 150 calls. We keep that as their example, not as a bill we calculated. goodcall.com/pricing, checked ${date}. If the same people call back, this way of billing can fit better than a per-minute plan.`,
    },
    {
      id: 'human',
      q: 'Which one fits if I need a person who can take over?',
      a: 'Smith.ai lists a transfer to a live receptionist. Abby Connect sells human minutes and AI minutes on the same plans, and AI time counts as half an Abby Minute. Ruby\'s plans are live receptionists, with optional AI at no extra cost on the plans page. Compare them on the AI versus live receptionist page and on Smith.ai versus Ruby. If a transfer fee isn\'t listed, we mark it as not listed.',
    },
    {
      id: 'industry',
      q: 'Which one fits my industry?',
      a: 'Use the industry guide for your work. Dentists, law firms, HVAC and plumbing, and the other guides list the tools this site already records for that field. Jobber\'s AI Receptionist is $99 a month for 100 conversations, then 79 cents, on Core, Connect, and Grow, on top of a Jobber plan. The Jobber software plan is extra, so this is not a receptionist you buy on its own. Housecall Pro\'s CSR AI price is not listed.',
    },
    {
      id: 'answering-service',
      q: 'Is an AI phone receptionist the same as an answering service?',
      a: 'An AI phone receptionist is software that answers the call. A traditional answering service uses people. Some companies sell both, or a mix, and say so on the pricing page. Ruby is the human-first example on this site. The live-versus-AI page compares sourced monthly totals. Check what\'s actually included, not just the product name.',
    },
  ].map((item) => ({ ...item, words: wordCount(item.a) }));
}
