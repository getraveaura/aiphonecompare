// Lowest monthly dollar amount written in a verified price string.
// Per-minute rates are ignored so they are not treated as a monthly price.
const AMOUNT = /\$(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?/g;

function gapBeforeNextDollar(text, index, matchLength) {
  const rest = text.slice(index + matchLength);
  const nextDollar = rest.indexOf('$');
  return (nextDollar === -1 ? rest : rest.slice(0, nextDollar)).toLowerCase();
}

function amountNumber(match) {
  const whole = match[1].replace(/,/g, '');
  const num = Number(match[2] ? `${whole}.${match[2]}` : whole);
  return Number.isFinite(num) ? num : null;
}

export function lowestMonthly(text) {
  if (text == null || !String(text).trim()) return null;
  const s = String(text);
  const matches = [...s.matchAll(AMOUNT)].map((match) => {
    const gap = gapBeforeNextDollar(s, match.index, match[0].length);
    const unit = gap.slice(0, 24);
    return {
      num: amountNumber(match),
      perMinute: /\/\s*min|per\s*min/.test(unit),
      monthly: /\/\s*mo\b|per\s*month|\/\s*month|\bmonthly\b|\bmo\b/.test(unit),
      bridge: /^\s*(?:to|or|–|-)\s*$/i.test(gap),
    };
  }).filter((item) => item.num != null && !item.perMinute);
  for (let i = matches.length - 2; i >= 0; i--) {
    if (!matches[i].monthly && matches[i].bridge && matches[i + 1].monthly) matches[i].monthly = true;
  }
  const found = matches.filter((item) => item.monthly).map((item) => item.num);
  return found.length ? Math.min(...found) : null;
}

export function byPublishedMonthlyPrice(vendors) {
  return [...vendors].sort((a, b) => {
    const an = lowestMonthly(a.starting_price);
    const bn = lowestMonthly(b.starting_price);
    if (an == null && bn == null) return a.name.localeCompare(b.name);
    if (an == null) return 1;
    if (bn == null) return -1;
    if (an !== bn) return an - bn;
    return a.name.localeCompare(b.name);
  });
}

export function lowestMonthlyListing(vendors) {
  const ranked = byPublishedMonthlyPrice(vendors).filter((v) => lowestMonthly(v.starting_price) != null);
  return ranked[0] || null;
}
