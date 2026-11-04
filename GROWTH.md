# aiphonecompare: 90-day growth plan (Nov 4, 2026 to Feb 2, 2027)

**Position:** the independent, verified price comparison for AI receptionists, by industry.
**Budget:** $0. **Current state:** 48 pages on GitHub Pages, 40 vendors, sitemap, llms.txt and JSON-LD already in place. aiphonecompare.com is not bought yet.

Rules that don't change: never invent a number, cite every price with a date, label sponsored spots, and get Nataya's OK before any email or post goes out under her name.

---

## 0. Priority matrix (impact ÷ effort)

| # | Move | Impact | Effort | When |
|---|---|---|---|---|
| 1 | Point aiphonecompare.com at Pages, set up Search Console and Bing Webmaster, submit the sitemap | High | Low | Week 1 |
| 2 | Vendor outreach: confirm pricing and offer the badge (30 emails ready) | High: backlinks plus data accuracy | Low | Weeks 1–2 |
| 3 | "AI receptionist pricing 2026" report page plus downloadable CSV | High: linkable, citable | Medium | Weeks 2–3 |
| 4 | Missed-call cost calculator (free, client-side JS) | High: links plus long-tail | Medium | Week 3 |
| 5 | Industry pages for medical, property management and home services, beyond dental/legal/plumbing | High: demand is stable | Medium | Weeks 2–6 |
| 6 | Submit to 20+ directories and launch sites | Medium | Low | Weeks 1–4 |
| 7 | Answer Reddit and community questions with data (no pitching) | Medium | Low, ongoing | From week 2 |
| 8 | Newsletter ("Price changes this month") | Medium, compounding | Low | Launch week 4 |
| 9 | Vendor-claimed profiles (free claim; vendor confirms data) | Medium | Medium | Weeks 5–8 |
| 10 | Quarterly AI Receptionist Price Index | High, recurring PR | Medium | Q1 2027 edition in Jan |
| 11 | Monetization: featured spots and affiliates | Revenue | Low | Gated by milestones (§8) |

---

## 1. SEO keyword targets → pages

**Sources:**
- **[D]** Damaruka, "AI receptionist search demand in 2026": Google Keyword Planner exact-match US data, pulled 2026-10-17 (https://damaruka.com/research/ai-receptionist-search-demand).
- **[V]** VoiceFleet blog, third-party tool figures including KD and CPC (https://voicefleet.ai/blog/virtual-receptionist-for-small-business-2026).
- **[C]** Credminds, trailing-12-month estimates (https://www.credminds.com/ai-receptionist-statistics).

All figures are **estimates**. Google reports them in buckets. Damaruka also flags that the August 2026 spike in "ai receptionist" may not be all buyers.

| Keyword | US monthly volume | Source | Target page | Status |
|---|---|---|---|---|
| ai receptionist | 5,400 usual; 450K Aug / 301K Sep 2026 spike | D | Home | Built; strengthen |
| ai answering service | 1,900 usual; 12,100 Sep | D | /ai-answering-service/ (comparison hub) | **Build wk 2** |
| ai receptionist for small business | 1,300 usual; 12,100 Sep (D) · 880, KD 13, CPC $58.51 (V) | D, V | /small-business/ | **Build wk 2** |
| ai phone answering service | 720 usual; 9,900 Sep | D | Hub above (secondary) | wk 2 |
| medical answering service | 5,400 every month (steadiest in category) | D | /industries/medical/ | **Build wk 3** |
| legal answering service | 480 → 1,300 Sep | D | /industries/legal/ | Built; retitle to include the term |
| property management answering service | 880; 1,600 Sep | D | /industries/property-management/ | Build wk 5 |
| after hours answering service | 880 | D | /after-hours/ | Build wk 6 |
| virtual receptionist | 2,400 usual | D | /ai-vs-virtual-receptionist/ | Build wk 6 |
| answering service cost | 170 | D | /pricing/ plus the report | Built; add the term |
| best ai receptionist | 390 | D | Home and /pricing/ (with "best for" filters, no paid ranks) | wk 4 |
| one party consent states / two party consent states | 4,400 / 3,600 | D | /call-recording-consent-by-state/ (AI-receptionist angle, cited to state law) | **Build wk 4 (sleeper)** |
| smith ai / ruby receptionist / my ai front desk | 5,400 / 1,600 / 720 | D | /vendors/{slug}/ plus "X alternatives" pages | wk 5–8 |
| ai answering service for small business | 260, KD 10 | V | /small-business/ | wk 2 |
| ai for law firms | ~15,300 per 12 months (est.) | C | /industries/legal/ guide section | wk 3 |

**Page patterns to build out (one page per real query, no thin spam):**
- **"{Vendor} pricing":** each vendor page gets a dated pricing block with a source.
- **"{Vendor} alternatives":** start with the 10 vendors that get the most searches.
- **"{A} vs {B}":** only for pairs people actually compare (e.g. Smith.ai vs Ruby, Rosie vs My AI Front Desk). Use a sourced side-by-side table.

**On-page:**
- **Title format:** "{Industry} AI receptionists compared: prices checked {Month YYYY}".
- **FAQ block** on each industry page, with FAQPage JSON-LD.
- **Visible "last checked" date** in the page header.

**Technical:**
- Custom domain (fixes canonicals; GitHub Pages URLs move to aiphonecompare.com).
- Google Search Console and Bing Webmaster (Bing feeds ChatGPT search and Copilot).
- IndexNow ping on deploy.
- Internal links from each vendor page to the industry pages it appears on.

---

## 2. Chatbot / AI-answer visibility (GEO)

1. **Bing Webmaster Tools + IndexNow.** Bing's index feeds ChatGPT search, Copilot, and many AI answer engines. Week 1.
2. **llms.txt** is live. Add **/llms-full.txt** with a full pricing table in plain markdown, and a machine-readable **/data/vendors.json** and **/data/vendors.csv** under a CC BY license with an attribution line. Answer engines and bloggers cite data they can download.
3. **Answer-first copy:** each industry page opens with one plain sentence answering the question, e.g. "Dental AI receptionists we verified start at $X–$Y/month (checked Nov 2026)." The numbers come from the data, never invented.
4. **Structured data:** ItemList and SoftwareApplication already exist. Add `offers` (price, priceCurrency, validFrom = last_checked), FAQPage, Dataset (for the report and CSV), and Organization with `sameAs` links.
5. **robots.txt:** explicitly allow GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended. This is a deliberate choice: we want to be cited.
6. **Entity consistency:** use the same name and one-line description on every directory, the X profile and GitHub, so models connect them.
7. **Monthly check:** ask ChatGPT, Perplexity, Gemini and Copilot 10 fixed prompts ("best AI receptionist for dentists", "how much does an AI receptionist cost", and so on). Log whether we're cited in `growth/ai-visibility.csv`.

---

## 3. Free directories and launch sites (submit weeks 1–4)

Account requirements below are **from general knowledge and not verified this session**. Re-check each at submission. Some need an account: Nataya must OK creating it, or create it herself. Use a business address, e.g. hello@aiphonecompare.com via free email forwarding (ImprovMX, or Cloudflare Email Routing if DNS is on Cloudflare) once the domain is bought.

| # | Site | Needs account? | Business email works? | Notes |
|---|---|---|---|---|
| 1 | Google Search Console | Google account | n/a | Not a directory, but do it first |
| 2 | Bing Webmaster Tools | MS/Google account | n/a | Feeds ChatGPT search |
| 3 | Google Business Profile | Not applicable | n/a | No physical service; skip |
| 4 | Product Hunt | Yes (personal profile) | Yes | Launch the pricing report or calculator, not the bare directory |
| 5 | Hacker News (Show HN) | Yes (username only) | No email needed | Post the open dataset/calculator; HN dislikes marketing |
| 6 | Indie Hackers | Yes | Yes | Build-in-public post |
| 7 | BetaList | Yes | Yes | Free queue is slow |
| 8 | AlternativeTo | Yes | Yes | List as an alternative to G2/Capterra for this category |
| 9 | SaaSHub | Yes | Yes | Free listing |
| 10 | There's An AI For That | Form; account optional | Yes | Free tier may be limited; verify |
| 11 | Futurepedia | Form | Yes | Paid fast-track exists; use free only |
| 12 | Toolify.ai | Account | Yes | Free tier available (verify) |
| 13 | TopAI.tools | Form | Yes | |
| 14 | AI Tools Directory (aitoolsdirectory.com) | Form | Yes | |
| 15 | Uneed | Account | Yes | Free queue |
| 16 | Microlaunch | Account | Yes | |
| 17 | Fazier | Account | Yes | |
| 18 | DevHunt | GitHub login | n/a | Fits if we open-source the dataset |
| 19 | GitHub: awesome-lists (e.g. awesome-ai-tools, awesome-voice-ai) | Existing GitHub (getraveaura) | n/a | PR adding the dataset; needs Nataya's OK per PR |
| 20 | Crunchbase (company profile) | Yes | Business email preferred | Entity signal for AI models |
| 21 | Wikidata | Account optional | n/a | Only if notability is met later; don't force it |
| 22 | Kaggle / data.world (dataset upload) | Yes | Yes | Dataset backlink plus Dataset entity |
| 23 | Medium / Substack (republish the report) | Yes | Yes | Canonical link back to the site |
| 24 | Reddit r/SideProject, r/InternetIsBeautiful | Account | n/a | One honest post each; follow sub rules |

Log each submission (date, URL, status) in `growth/submissions.csv`.

---

## 4. Backlink plays

1. **Vendor badges** (ready: /badge/, 30 emails found). Expected: some vendors link back. Track links in `growth/links.csv`.
2. **"AI Receptionist Pricing Report, Winter 2026–27":**
   - **Contents:** median and range of verified starting prices by industry and by billing model (flat, per-minute, per-call), and the share of vendors offering a BAA, a free trial or human handoff. All computed from vendors.json, with every input linked.
   - **Packaging:** a downloadable CSV, embeddable charts with attribution, and a "cite this" box.
   - **Pitch:** 15–20 writers who already publish on this (e.g. authors of AI-receptionist roundups, dental/legal/trades trade blogs, small-business newsletters). One short email each, and only with Nataya's OK.
3. **Reporter requests:** answer free journalist-query services (Qwoted, Featured, HARO successor sites) with data from the report. These need an account (Nataya's OK).
4. **Resource pages:** dental associations, state bar practice-management advisors, and trade associations (PHCC chapters) publish vendor and resource lists. Ask to be added as a neutral comparison.
5. **Data corrections as links:** when a third-party roundup's price is outdated, send a friendly note with our dated source. Some will update and cite us.
6. **Open dataset on GitHub:** a public repo with vendors.csv plus a changelog. Developers and bloggers link to datasets.

---

## 5. Community channels (help first, link only when asked or allowed)

| Channel | Who's there | Evidence |
|---|---|---|
| r/smallbusiness | General SMB owners | Active threads in 2026: "Ai Receptionist" (Aug 2026), "What voice AI tools have people actually tried and hated?" (Sep 2026), "Using an AI to answer the phones" (Jan 2026) |
| r/smallbusinessowner | SMB owners | "Anyone using AI call answering… peak hours?" (Feb 2026) |
| r/Dentistry, r/DentalHygiene, Dentaltown forums | Dental offices | Industry fit; confirm rules before posting |
| r/LawFirm, r/Lawyertalk | Solo and small firms | Legal intake questions |
| r/Plumbing, r/HVAC, r/sweatystartup, ContractorTalk | Trades | After-hours calls |
| r/PropertyManagement | PMs | Stable "property management answering service" demand |
| Facebook groups (dental office managers, home-service business owners) | Owners and office managers | Need Nataya's personal FB account; her call |
| X: search "AI receptionist" daily | Mostly vendors plus some buyers | Earlier X scan: mostly vendor posts |
| Quora: "AI receptionist" and "answering service cost" questions | Long-tail searchers | Ranks in Google |

**Playbook:**
- Answer the actual question (what breaks, what to test, typical price range with a source).
- Link to our page only where it directly answers the question and the subreddit's rules allow it.
- Never astroturf, never use multiple accounts, never post without Nataya's account approval.
- Insight to reuse from the Reddit threads: buyers care about **live transfer with context, CRM write-back, and confirmed bookings, not demos**. Add a "What to test in a demo" checklist to every industry page.

---

## 6. Newsletter: "AI Receptionist Price Watch"

- **Promise:** monthly, under 3 minutes to read. It covers every verified price change, new vendors, one buyer tip, and one industry spotlight.
- **Tooling ($0):**
  - Resend is connected (free tier; verify limits) and works for sending once the domain is verified.
  - For signup without a backend: Buttondown's free tier, or a Resend audience plus a tiny form endpoint. Both need an account, so Nataya's OK.
  - Fallback: a "Get updates" link to a Substack.
- **Signup placement:** a footer form, inline on /pricing/ ("Get notified when prices change"), and after the calculator result.
- **Content engine:** monthly re-checks of all vendor prices produce a diff in `data/changes/YYYY-MM.json`. That diff drives both the newsletter and a public /changelog/ page.
- **Cadence:** issue #1 in week 4 (launch alongside the pricing report), then the first Tuesday of each month.
- **Targets:** 100 subscribers by day 60 and 300 by day 90. These are goals, not forecasts.

---

## 7. Fresh ideas (not yet discussed)

1. **Missed-call cost calculator** (/tools/missed-call-cost/):
   - **Inputs:** calls per week, % missed, % of callers who would book, average job value.
   - **Output:** monthly revenue at risk versus verified AI receptionist price ranges. The user supplies the numbers and we show the arithmetic; no invented benchmarks.
   - **Extras:** an embeddable widget with attribution backlink.
2. **Quarterly AI Receptionist Price Index:**
   - **Contents:** median verified starting price by industry, tracked over time. Same methodology each edition, archived snapshots.
   - **Use:** press bait plus newsletter anchor. First edition January 2027.
3. **Vendor-claimed profiles:**
   - **How it works:** a vendor verifies via an email on their own domain and confirms or corrects fields, each with a public source URL. They get a "Vendor-confirmed" tick (not paid).
   - **Purpose:** increases accuracy and gives vendors a reason to link to us.
4. **Call-recording consent by state page:** 4,400 + 3,600 monthly searches per [D]. AI receptionists record calls, so the page is directly relevant and cited to state statutes.
5. **"What to test in a demo" checklist:** printable, per industry. Drawn from real buyer complaints (warm transfer, write-back, confirmed booking, quick escalation to a human).
6. **BAA tracker for dental and medical:** which vendors publicly state they sign a BAA, with source links. High trust value for healthcare buyers.
7. **Price-change alerts:** "Watch this vendor" email when its listed price changes. Doubles as newsletter signup.
8. **Public changelog and corrections log:** shows the "verified" claim in action. Builds trust with journalists.
9. **Open dataset (CC BY):** builds citations and AI-answer inclusion.
10. **"Built-in vs standalone" guides:** e.g. Jobber, Housecall Pro and ServiceTitan built-in AI versus standalone tools. These answer a real trades question.

---

## 8. Monetization milestones (labeled, never for rank)

| Milestone (any 2 of 3) | Unlock |
|---|---|
| 1,000 monthly organic visits, OR 100 subscribers, OR 10 vendor-confirmed profiles | **Affiliate links** where vendors run public programs. Disclosed on-page with "We may earn a commission; it never changes order or data." Never on prices. |
| 3,000 monthly visits, OR 300 subscribers, OR 3 inbound vendor sponsorship asks | **Featured spots** go live: labeled "Sponsored", max 1–2 per industry page, flat monthly fee. Tier prices set from real traffic at that time (current $49/$149/$299 are placeholders). Needs Stripe, a payment link and Nataya's account approval. |
| 500 subscribers | **Newsletter sponsor slot** (one per issue, labeled) |
| Report cited by 5+ external sites | **Paid "vendor data kit"** (pricing benchmarks for vendors' sales teams). Explore only. |

**Guardrails:**
- Sponsored placements never change data and never change order among non-sponsored listings.
- A sponsor's listing is re-verified on the same schedule as every other listing.

---

## 9. First 4 weeks (week by week)

**Week 1 (Nov 4–10): foundations**
- Nataya buys aiphonecompare.com. Add a CNAME file to the repo, set the DNS records, and switch Astro `site` to the custom domain, using `base: '/'`.
- Search Console, Bing Webmaster and IndexNow: submit the sitemap.
- Business email forwarding (hello@).
- Send vendor outreach batch 1 (15 emails), **pending Nataya's approval** of the template.
- Submit to 6 directories with no account (form-only): TopAI.tools, AI Tools Directory, Futurepedia (free), TAAFT (free), and others as verified.
- robots.txt: explicitly allow AI crawlers. Add `offers` to the JSON-LD.

**Week 2 (Nov 11–17): demand pages**
- Build /ai-answering-service/ and /small-business/, each with a filtered table, a guide and FAQ JSON-LD.
- Re-verify the 7 thin vendor records. Try to fill blanks from vendor sites.
- Send outreach batch 2 (remaining 15). Process replies into a corrections log.
- First 3 helpful Reddit answers in existing threads (Nataya's account and her OK).

**Week 3 (Nov 18–24): linkable assets**
- Ship the missed-call cost calculator.
- Build /industries/medical/ (5,400/mo steady demand). Add medical-capable vendors with sources.
- Draft the pricing report from vendors.json. Publish /data/vendors.csv (CC BY).
- Submit to 6 account-based directories (Nataya's OK per account).

**Week 4 (Nov 25–Dec 1): launch**
- Publish the "AI Receptionist Pricing Report" and send newsletter issue #1.
- Product Hunt and Show HN launch of the report plus calculator. Indie Hackers post.
- Pitch 15 writers (drafts for Nataya's approval).
- Build the call-recording consent by state page.
- First AI-visibility check (10 prompts across 4 assistants), logged.

**Weeks 5–8:**
- Vendor-claimed profiles.
- Property management and after-hours pages.
- "Alternatives" pages for the top 5 searched vendors.
- Second outreach wave (follow-ups only to vendors who replied).

**Weeks 9–12:**
- Q1 2027 Price Index.
- AI vs virtual receptionist page.
- Review milestones in §8 and decide on affiliates and featured spots.
- Refresh every price (monthly check). Second newsletter, then the third.

---

## 10. Metrics (weekly, in growth/metrics.csv)

- **Search:** indexed pages, impressions and clicks (Search Console).
- **Links:** referring domains (Bing Webmaster plus a free backlink checker).
- **Audience:** newsletter subscribers.
- **Vendor engagement:** vendor replies, corrections and badges installed.
- **AI visibility:** AI-answer citations (monthly prompt panel).
- **Data freshness:** % of vendors with a price checked in the last 30 days (target 100%).
