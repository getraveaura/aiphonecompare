import { firstSentence } from './schema.mjs';
import { changesNewestFirst } from './price-index.mjs';

// Headline is the first sentence of the logged summary. Never invent wording.
export function priceChangeHeadline(change) {
  return firstSentence(change?.summary || '');
}

export function summaryRest(summary) {
  const first = firstSentence(summary);
  if (!first) return '';
  const rest = String(summary).slice(first.length).trim();
  return rest;
}

export function mondayOf(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function sundayOf(mondayIso) {
  const date = new Date(`${mondayIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return mondayIso;
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function weekRangeLabel(mondayIso, formatDate) {
  const sunday = sundayOf(mondayIso);
  const start = new Date(`${mondayIso}T00:00:00Z`);
  const end = new Date(`${sunday}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${formatDate(mondayIso)} to ${formatDate(sunday)}`;
  }
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(end);
    return `${start.getUTCDate()}–${end.getUTCDate()} ${monthYear}`;
  }
  return `${formatDate(mondayIso)} to ${formatDate(sunday)}`;
}

// Group logged changes by calendar week (Monday to Sunday), newest week first.
export function changesByWeek(log, { todayIso } = {}) {
  const groups = new Map();
  const order = [];
  for (const change of changesNewestFirst(log)) {
    const week = mondayOf(change.observed);
    if (!groups.has(week)) {
      groups.set(week, { monday: week, sunday: sundayOf(week), changes: [] });
      order.push(week);
    }
    groups.get(week).changes.push(change);
  }
  const currentMonday = todayIso ? mondayOf(todayIso) : '';
  return order.map((week) => ({
    ...groups.get(week),
    isThisWeek: Boolean(currentMonday) && week === currentMonday,
  }));
}
