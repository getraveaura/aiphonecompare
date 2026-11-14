// Turns the answer-first summary sentences (built from src/data in
// answers.mjs, best-guides.mjs and landings.mjs) into short, scannable
// bullets. Only rewording: every number comes from the sentence it replaces.
// Boilerplate trust lines move to a short footer note. "**x**" marks bold.

const BOILER = [
  /^That is simple math on each company’s listed prices, not a ranking\.$/,
  /^It is not a ranked list\.$/,
  /^Rows are alphabetical, sponsored listings are labeled, and payment does not change a price\.$/,
  /^This page is for .+ comparing AI receptionists\.$/,
  /^Figures are simple math on each company’s listed prices, not a ranking\.$/,
];
const NOT_RANKED_NOTE = 'Not a ranking: rows are alphabetical and sponsored listings are labeled.';

const dollars = (s) => s.replace(/\.00\b/, '');

export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9$])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const RULES = [
  [/^aiphonecompare lists (\d+) (AI receptionists?) for (.+)\.$/, (m) => `**${m[1]}** ${m[2]} listed for ${m[3]}`],
  [/^(\d+) vendors are in the (.+?) directory used on this page\.$/, (m) => `**${m[1]}** AI receptionists in the ${m[2]} directory`],
  [/^The lowest (?:paid )?monthly amount written in (?:these listings|a listing here) is (\$[\d,.]+\/mo), for (.+?)(?:, checked [^.;]+)?(?:; (.+))?\.$/,
    (m) => `Cheapest listed plan starts at **${dollars(m[1])}** (${m[2]})${m[3] ? `; ${m[3]}` : ''}`],
  [/^None of these listings has a monthly dollar amount in the starting price\.$/, () => 'No listing here publishes a monthly dollar price'],
  [/^(\d+) of (\d+) listings say something about HIPAA.*$/, (m) => `**${m[1]} of ${m[2]}** mention patient privacy (HIPAA)`],
  [/^(\d+) of (\d+) listings describe how a call reaches a person.*$/, (m) => `**${m[1]} of ${m[2]}** say how a call reaches a real person`],
  [/^At (\d+) calls a month, full monthly estimates range from (\$[\d,.]+) for (.+?) to (\$[\d,.]+) for (.+?)\.$/,
    (m) => `At **${m[1]} calls/mo**, full estimates run **${dollars(m[2])}** (${m[3]}) to **${dollars(m[4])}** (${m[5]})`],
  [/^The starting-price table below lists (\d+) vendors with a recorded price\.$/, (m) => `**${m[1]}** vendors with a recorded starting price in the table below`],
];

// Bold dollar amounts and "N of M" in any sentence without a specific rule.
function autoBold(s) {
  return s.replace(/(\$[\d,]+(?:\.\d{2})?(?:\/mo)?|\b\d+ of \d+\b)/g, '**$1**');
}

export function summaryPoints(sentences = []) {
  const points = [];
  let notRanked = false;
  for (const s of sentences.flatMap(splitSentences)) {
    if (BOILER.some((re) => re.test(s))) { notRanked = true; continue; }
    const record = s.match(/^On record, (.+)\.$/);
    if (record) {
      for (const part of record[1].split(/; (?=(?:free trial|human handoff|HIPAA privacy agreement \(BAA\)): )/)) {
        const i = part.indexOf(': ');
        const label = part.slice(0, i).replace(/^./, (c) => c.toUpperCase());
        points.push(`**${label}:** ${part.slice(i + 2).replace(/^./, (c) => c.toUpperCase())}`);
      }
      continue;
    }
    const rule = RULES.find(([re]) => re.test(s));
    points.push(rule ? rule[1](s.match(rule[0])) : autoBold(s.replace(/\.$/, '')));
  }
  return { points, note: notRanked ? NOT_RANKED_NOTE : '' };
}

// "**x** y" -> [{ text: 'x', bold: true }, { text: ' y', bold: false }]
export function boldParts(point) {
  return String(point).split(/\*\*(.+?)\*\*/).map((text, i) => ({ text, bold: i % 2 === 1 })).filter((p) => p.text);
}
