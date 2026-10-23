// toggleDay и кнопки «Начались» / «Закончились» (раздел 4). Возвращают новый массив
import { byStart, effectiveEnd } from './cycle';
import { addDays, inRange, type DateStr } from './dates';
import type { Period } from './types';

export type IdFn = () => string;
const defaultId: IdFn = () => crypto.randomUUID();

export function toggleDay(
  periods: Period[],
  date: DateStr,
  today: DateStr,
  newId: IdFn = defaultId,
): Period[] {
  if (date > today) return periods;
  const sorted = [...periods].sort(byStart);

  const inside = sorted.find((p) => inRange(date, p.start, effectiveEnd(p, today)));
  if (inside) return removeDay(sorted, inside, date, today, newId);

  const before = sorted.find((p) => p.end !== null && addDays(p.end, 1) === date);
  const after = sorted.find((p) => addDays(p.start, -1) === date);

  if (before && after) {
    const merged: Period = { id: before.id, start: before.start, end: after.end };
    return sorted.filter((p) => p !== before && p !== after).concat(merged).sort(byStart);
  }
  if (before) return replace(sorted, before, { ...before, end: date });
  if (after) return replace(sorted, after, { ...after, start: date });

  return [...sorted, { id: newId(), start: date, end: date }].sort(byStart);
}

function removeDay(
  sorted: Period[],
  p: Period,
  date: DateStr,
  today: DateStr,
  newId: IdFn,
): Period[] {
  const end = effectiveEnd(p, today);
  if (p.start === end) return sorted.filter((x) => x !== p);
  if (date === p.start) return replace(sorted, p, { ...p, start: addDays(date, 1) });
  if (date === end) return replace(sorted, p, { ...p, end: addDays(date, -1) });

  const first: Period = { id: p.id, start: p.start, end: addDays(date, -1) };
  const second: Period = { id: newId(), start: addDays(date, 1), end: p.end };
  return sorted.filter((x) => x !== p).concat(first, second).sort(byStart);
}

/** Если месячные закончились вчера или сегодня уже отмечено — продолжает их */
export function startPeriod(periods: Period[], today: DateStr, newId: IdFn = defaultId): Period[] {
  const sorted = [...periods].sort(byStart);
  if (sorted.some((p) => p.end === null)) return sorted;
  const touching = sorted.find(
    (p) => p.end !== null && p.start <= today && addDays(p.end, 1) >= today,
  );
  if (touching) return replace(sorted, touching, { ...touching, end: null });
  return [...sorted, { id: newId(), start: today, end: null }].sort(byStart);
}

export function finishPeriod(periods: Period[], today: DateStr): Period[] {
  const sorted = [...periods].sort(byStart);
  const ongoing = sorted.find((p) => p.end === null);
  return ongoing ? replace(sorted, ongoing, { ...ongoing, end: today }) : sorted;
}

const replace = (list: Period[], from: Period, to: Period) => list.map((p) => (p === from ? to : p));
