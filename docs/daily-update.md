# Daily update

A weekday job can append a story or a price change, then open a pull request. Do not invent a name, a number, a quote, or a date. If the source does not say it, leave the field null or write nothing.

Validate and build:

```bash
npm test
npm run build
```

`npm test` checks that every story and every price change has an `https` source URL and a `YYYY-MM-DD` date, that a vendor slug exists in `src/data/vendors.json`, and that the match ranking does not use sponsorship.

## Add a story

Append one object to `src/data/stories.json`. Do not rewrite older objects.

| Field | Required | Notes |
| --- | --- | --- |
| `slug` | yes | Lowercase, unique, used in `/stories/<slug>/`. |
| `title` | yes | Short. No claim the source does not make. |
| `added` | yes | The date you add it to this file, `YYYY-MM-DD`. |
| `industries` | yes | One or more of `dental`, `medical`, `legal`, `plumbing`, `hvac`, `roofing`, `other`. |
| `business` | no | `null` when the source does not name it. |
| `vendorSlug` | no | A slug from `src/data/vendors.json`, or `null`. |
| `vendorName` | no | The name the source uses. `null` if it names none. |
| `vendorPublished` | yes | `true` when the source is the vendor, or an episode made with the vendor. |
| `sourceLabel` | yes | `Press`, `Vendor case study`, `Vendor podcast`, `Vendor-sponsored podcast`, `Podcast`, or `Review analysis`. |
| `whatTheyDid` | yes | Paraphrase. No long quotation. |
| `cost` | no | `null` when the source gives no price. |
| `outcome` | yes | What the source says happened. Say whose number it is. |
| `catches` | yes | An array. Use `[]` when the source states no catch. |
| `sources` | yes | At least one `{ url, title, date, publisher }`. `date` is the source date. |

A catch object:

```json
{
  "id": "callers-reject-ai",
  "label": "Short name of the issue",
  "summary": "Paraphrase of what this source says.",
  "sources": [{ "url": "https://example.com/story", "title": "Page title", "date": "2026-11-09", "publisher": "Publisher" }]
}
```

Reuse an existing `id` only when this source reports the same issue, not a similar success. Leave `industries` off the catch to count it for every industry on the story. Set `"industries": []` when the source is a multi-trade roundup that should not be counted as evidence for one industry page.

The page shows "N sources report this" only when more than one source URL shares that `id`.

## Add a price change

Append one object to `changes` in `src/data/price-changes.json`.

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique, used in `/price-changes/<id>/`. |
| `vendorSlug` | yes | Must exist in `src/data/vendors.json`. |
| `added` | yes | The date you add the row. |
| `observed` | yes | The date you compared the sources. |
| `summary` | yes | Say what is known and what is not, including when the switch day is unknown. |
| `before` | yes | The older public price, in words. |
| `after` | yes | The newer public price, in words. |
| `sources` | yes | At least one URL and date for the old price and one for the new price. |

Then update that vendor's `starting_price` and `last_checked` in `src/data/vendors.json` if the new text is now the listing. Update the same slug in `src/data/price-baseline.json` so `starting_price` and `last_checked` match. The baseline is the current text, not the history. The history is `price-changes.json`.

If you cannot verify a change, do not append one. The price-changes page already says tracking started on 2026-11-09.

## Add a source to an existing story

Append to that story's `sources`, or to the `sources` array of the catch it supports. Do not create a second story for the same account.

## What the build writes

`npm run build` regenerates `dist/sitemap.xml`, `dist/llms.txt`, `dist/llms-full.txt`, and `dist/feed.xml` from these files. New story and price-change pages are included because they are built as HTML.
