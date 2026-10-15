// Правка месячных тапом по дню и кнопками «Начались» / «Закончились»
// (раздел 4). Функции не меняют входной массив, а возвращают новый.
import { addDays, inRange, type DateStr } from './dates';
import { effectiveEnd, sortPeriods } from './cycle';
import type { Period } from './types';

export type IdFn = () => string;
const defaultId: IdFn = () => crypto.randomUUID();

/**
 * Тап по дню:
 * - внутри месячных: крайний день снимается (укорачивает), средний — делит их на две части,
 *   единственный день удаляет месячные целиком;
 * - вплотную к месячным: продлевает их, а если день между двумя месячными — склеивает;
 * - далеко от любых месячных: новые месячные из одного дня;
 * - будущие дни не меняются.
 */
export function toggleDay(
  periods: Period[],
  date: DateStr,
  today: DateStr,
  newId: IdFn = defaultId,
): Period[] {
  if (date > today) return periods;
  const sorted = sortPeriods(periods);

  const inside = sorted.find((p) => inRange(date, p.start, effectiveEnd(p, today)));
  if (inside) return removeDay(sorted, inside, date, today, newId);

  // Соседние месячные: закончились накануне и начинаются на следующий день
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
  // Последний день (для идущих сейчас — сегодня): месячные закончились накануне
  if (date === end) return replace(sorted, p, { ...p, end: addDays(date, -1) });

  const first: Period = { id: p.id, start: p.start, end: addDays(date, -1) };
  const second: Period = { id: newId(), start: addDays(date, 1), end: p.end };
  return sorted.filter((x) => x !== p).concat(first, second).sort(byStart);
}

/**
 * «Начались»: месячные с сегодняшнего дня, end = null.
 * Если вчера месячные закончились или сегодня уже отмечено — продолжаем их.
 */
export function startPeriod(periods: Period[], today: DateStr, newId: IdFn = defaultId): Period[] {
  const sorted = sortPeriods(periods);
  if (sorted.some((p) => p.end === null)) return sorted;
  const touching = sorted.find(
    (p) => p.end !== null && p.start <= today && addDays(p.end, 1) >= today,
  );
  if (touching) return replace(sorted, touching, { ...touching, end: null });
  return [...sorted, { id: newId(), start: today, end: null }].sort(byStart);
}

/** «Закончились»: у идущих сейчас месячных end = сегодня */
export function finishPeriod(periods: Period[], today: DateStr): Period[] {
  const sorted = sortPeriods(periods);
  const ongoing = sorted.find((p) => p.end === null);
  return ongoing ? replace(sorted, ongoing, { ...ongoing, end: today }) : sorted;
}

const byStart = (a: Period, b: Period) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
const replace = (list: Period[], from: Period, to: Period) => list.map((p) => (p === from ? to : p));
