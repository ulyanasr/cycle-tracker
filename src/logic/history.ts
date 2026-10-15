// «История циклов» (5.6): циклы выбранного года, новые сверху
import { effectiveEnd, sortPeriods, yearStats } from './cycle';
import { addDays, diffDays, yearOf, type DateStr } from './dates';
import type { Period } from './types';

/** Ширина полоски: 35 дней = 100% */
export const BAR_MAX_DAYS = 35;

export interface HistoryCycle {
  start: DateStr;
  /** Последний день цикла (накануне следующих месячных); null — цикл идёт */
  end: DateStr | null;
  /** Длина завершённого цикла или идущий день текущего */
  days: number;
  periodDays: number;
  current: boolean;
  /** Для текущего: ожидаемая длина (средний цикл) */
  expected: number | null;
}

export function yearCycles(periods: Period[], year: number, today: DateStr): HistoryCycle[] {
  const sorted = sortPeriods(periods);
  const avg = yearStats(periods, yearOf(today)).avgCycle;
  const out: HistoryCycle[] = [];
  sorted.forEach((p, i) => {
    if (yearOf(p.start) !== year) return;
    const next = sorted[i + 1];
    const periodDays = diffDays(effectiveEnd(p, today), p.start) + 1;
    if (next) {
      out.push({
        start: p.start,
        end: addDays(next.start, -1),
        days: diffDays(next.start, p.start),
        periodDays,
        current: false,
        expected: null,
      });
    } else {
      out.push({ start: p.start, end: null, days: diffDays(today, p.start) + 1, periodDays, current: true, expected: avg });
    }
  });
  return out.reverse();
}

/** Годы для «Архива»: прошлые годы с отметками, новые сверху */
export const archiveYears = (periods: Period[], today: DateStr): number[] =>
  [...new Set(periods.map((p) => yearOf(p.start)))].filter((y) => y < yearOf(today)).sort((a, b) => b - a);

/**
 * Доли полоски (0–1 от всей ширины):
 * period — красная часть, rest — сиреневая, remaining — серая (только у идущего цикла).
 */
export function barParts(c: HistoryCycle) {
  const total = c.current ? Math.max(c.days, c.expected ?? c.days) : c.days;
  const width = Math.min(total, BAR_MAX_DAYS) / BAR_MAX_DAYS;
  const scale = width / total;
  const period = Math.min(c.periodDays, c.days) * scale;
  const rest = (c.days - Math.min(c.periodDays, c.days)) * scale;
  return { period, rest, remaining: width - period - rest };
}
