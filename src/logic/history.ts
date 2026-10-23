// «История циклов» (5.6)
import { effectiveEnd, isAtypical, windowStats } from './cycle';
import { addDays, diffDays, yearOf, type DateStr } from './dates';
import type { Period } from './types';

const BAR_MAX_DAYS = 35;

export interface HistoryCycle {
  start: DateStr;
  /** null — цикл идёт */
  end: DateStr | null;
  days: number;
  periodDays: number;
  current: boolean;
  /** Ожидаемая длина идущего цикла */
  expected: number | null;
  atypical: boolean;
}

/** Циклы, начавшиеся в году year, новые сверху */
export function yearCycles(periods: Period[], year: number, today: DateStr): HistoryCycle[] {
  const expected = windowStats(periods).avgCycle;
  return periods
    .flatMap((p, i): HistoryCycle[] => {
      if (yearOf(p.start) !== year) return [];
      const next = periods[i + 1];
      const periodDays = diffDays(effectiveEnd(p, today), p.start) + 1;
      if (!next) {
        return [{ start: p.start, end: null, days: diffDays(today, p.start) + 1, periodDays, current: true, expected, atypical: false }];
      }
      const days = diffDays(next.start, p.start);
      return [{ start: p.start, end: addDays(next.start, -1), days, periodDays, current: false, expected: null, atypical: isAtypical(days) }];
    })
    .reverse();
}

export const archiveYears = (periods: Period[], today: DateStr): number[] =>
  [...new Set(periods.map((p) => yearOf(p.start)))].filter((y) => y < yearOf(today)).sort((a, b) => b - a);

/** Доли ширины полоски: 35 дней = 100%, длиннее — тоже 100%. remaining — серый остаток идущего цикла */
export function barParts(c: HistoryCycle) {
  const total = c.current ? Math.max(c.days, c.expected ?? 0) : c.days;
  const scale = Math.min(total, BAR_MAX_DAYS) / total / BAR_MAX_DAYS;
  const period = Math.min(c.periodDays, c.days);
  return { period: period * scale, rest: (c.days - period) * scale, remaining: (total - c.days) * scale };
}
