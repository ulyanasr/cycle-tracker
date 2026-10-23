import { countedPeriods, effectiveEnd, isAtypical, isStrayMark } from './cycle';
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
  atypical: boolean;
  /** Лишние отметки внутри цикла — для подписи «Отметка [дата] не учитывается» */
  strayMarks: DateStr[];
}

/** Циклы, начавшиеся в году year, новые сверху. Лишние отметки не делят цикл */
export function yearCycles(periods: Period[], year: number, today: DateStr): HistoryCycle[] {
  const strays = periods.filter((_, i) => isStrayMark(periods, i)).map((p) => p.start);
  const ps = countedPeriods(periods);
  return ps
    .flatMap((p, i): HistoryCycle[] => {
      if (yearOf(p.start) !== year) return [];
      const next = ps[i + 1];
      const periodDays = diffDays(effectiveEnd(p, today), p.start) + 1;
      const strayMarks = strays.filter((d) => d > p.start && (!next || d < next.start));
      if (!next) {
        return [{ start: p.start, end: null, days: diffDays(today, p.start) + 1, periodDays, current: true, atypical: false, strayMarks }];
      }
      const days = diffDays(next.start, p.start);
      return [{ start: p.start, end: addDays(next.start, -1), days, periodDays, current: false, atypical: isAtypical(days), strayMarks }];
    })
    .reverse();
}

export const archiveYears = (periods: Period[], today: DateStr): number[] =>
  [...new Set(periods.map((p) => yearOf(p.start)))].filter((y) => y < yearOf(today)).sort((a, b) => b - a);

/** Доли ширины полоски: 35 дней = 100%, длиннее — тоже 100% */
export function barParts({ days, periodDays }: Pick<HistoryCycle, 'days' | 'periodDays'>) {
  const scale = Math.min(days, BAR_MAX_DAYS) / days / BAR_MAX_DAYS;
  const period = Math.min(periodDays, days);
  return { period: period * scale, rest: (days - period) * scale };
}
