// Расчёты цикла (раздел 4 спецификации). Только чистые функции:
// «сегодня» всегда передаётся параметром, чтобы тесты были детерминированы.
import { addDays, diffDays, inRange, yearOf, type DateStr } from './dates';
import type { Period } from './types';

export const DEFAULT_CYCLE = 28;
export const DEFAULT_PERIOD = 5;
export const LUTEAL_DAYS = 14;
/**
 * Промежуток длиннее этого — не цикл, а пропуск в отметках (например,
 * не отмечала с января по август). В средние, минимум, максимум и разброс
 * он не входит, иначе прогноз ломается.
 */
export const MAX_CYCLE_DAYS = 60;

export const isGap = (cycleLength: number) => cycleLength > MAX_CYCLE_DAYS;

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export const sortPeriods = (periods: Period[]): Period[] =>
  [...periods].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

/** Последний день месячных: для идущих сейчас — сегодня */
export const effectiveEnd = (p: Period, today: DateStr): DateStr => p.end ?? today;

export const lastPeriod = (periods: Period[]): Period | null => {
  const sorted = sortPeriods(periods);
  return sorted[sorted.length - 1] ?? null;
};

/** Последние месячные, начавшиеся не позже date */
export const periodStartedBy = (periods: Period[], date: DateStr): Period | null => {
  const sorted = sortPeriods(periods).filter((p) => p.start <= date);
  return sorted[sorted.length - 1] ?? null;
};

/* ---------------- Средние ---------------- */

export interface CycleRecord {
  start: DateStr; // начало месячных, с которых начался цикл
  nextStart: DateStr; // начало следующих
  length: number;
}

/** Завершённые циклы: от начала одних месячных до начала следующих */
export const completedCycles = (periods: Period[]): CycleRecord[] => {
  const sorted = sortPeriods(periods);
  const out: CycleRecord[] = [];
  for (let i = 1; i < sorted.length; i++) {
    out.push({
      start: sorted[i - 1].start,
      nextStart: sorted[i].start,
      length: diffDays(sorted[i].start, sorted[i - 1].start),
    });
  }
  return out;
};

export interface Stats {
  avgCycle: number;
  avgPeriod: number;
  minCycle: number;
  maxCycle: number;
  /** ±N дней: (макс − мин) / 2 */
  spread: number;
  cycleCount: number;
  periodCount: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Средние по году year (по умолчанию — текущий). Цикл относится к году,
 * в котором он начался. Пропуски в отметках (> 60 дней) не учитываются.
 * Пока данных нет — 28 и 5 дней.
 */
export const yearStats = (periods: Period[], year: number): Stats => {
  const cycles = completedCycles(periods)
    .filter((c) => yearOf(c.start) === year && !isGap(c.length))
    .map((c) => c.length);
  const lengths = periods
    .filter((p) => p.end !== null && yearOf(p.start) === year)
    .map((p) => diffDays(p.end as DateStr, p.start) + 1);

  const avgCycle = cycles.length ? Math.round(mean(cycles)) : DEFAULT_CYCLE;
  const minCycle = cycles.length ? Math.min(...cycles) : avgCycle;
  const maxCycle = cycles.length ? Math.max(...cycles) : avgCycle;
  return {
    avgCycle,
    avgPeriod: lengths.length ? Math.round(mean(lengths)) : DEFAULT_PERIOD,
    minCycle,
    maxCycle,
    spread: Math.round((maxCycle - minCycle) / 2),
    cycleCount: cycles.length,
    periodCount: lengths.length,
  };
};

/* ---------------- Прогноз на следующий цикл ---------------- */

export interface Forecast {
  /** Наиболее вероятное начало следующих месячных */
  nextStart: DateStr;
  /** Диапазон вероятного начала: по минимальному и максимальному циклу */
  rangeStart: DateStr;
  rangeEnd: DateStr;
  /** Прогнозные дни следующих месячных: rangeStart … nextStart + средние − 1 */
  periodFrom: DateStr;
  periodTo: DateStr;
  /** Прогнозный конец идущих сейчас месячных, иначе null */
  currentEnd: DateStr | null;
  ovulation: DateStr;
  fertileFrom: DateStr;
  fertileTo: DateStr;
}

export const forecast = (periods: Period[], today: DateStr): Forecast | null => {
  const last = lastPeriod(periods);
  if (!last) return null;
  const s = yearStats(periods, yearOf(today));

  const nextStart = addDays(last.start, s.avgCycle);
  const rangeStart = addDays(last.start, s.minCycle);
  const ovulation = addDays(nextStart, -LUTEAL_DAYS);
  return {
    nextStart,
    rangeStart,
    rangeEnd: addDays(last.start, s.maxCycle),
    periodFrom: rangeStart,
    periodTo: addDays(nextStart, s.avgPeriod - 1),
    currentEnd: last.end === null ? addDays(last.start, s.avgPeriod - 1) : null,
    ovulation,
    fertileFrom: addDays(ovulation, -5),
    fertileTo: addDays(ovulation, 1),
  };
};

/* ---------------- Текущее состояние ---------------- */

export const isPeriodDay = (periods: Period[], date: DateStr, today: DateStr): boolean =>
  periods.some((p) => inRange(date, p.start, effectiveEnd(p, today)));

/** День цикла: date − начало последних месячных до неё + 1 */
export const cycleDay = (periods: Period[], date: DateStr): number | null => {
  const p = periodStartedBy(periods, date);
  return p ? diffDays(date, p.start) + 1 : null;
};

export type Status =
  | { kind: 'empty' }
  | { kind: 'period'; day: number }
  | { kind: 'until'; days: number }
  | { kind: 'delay'; days: number };

/** Что показать на карточке главной */
export const status = (periods: Period[], today: DateStr): Status => {
  const last = lastPeriod(periods);
  const f = forecast(periods, today);
  if (!last || !f) return { kind: 'empty' };
  if (inRange(today, last.start, effectiveEnd(last, today))) {
    return { kind: 'period', day: diffDays(today, last.start) + 1 };
  }
  const left = diffDays(f.nextStart, today);
  return left < 0 ? { kind: 'delay', days: -left } : { kind: 'until', days: left };
};

/**
 * Фаза на дату (не позже сегодня). Для прошлых циклов овуляция считается
 * от фактического начала следующих месячных, для текущего — от прогноза.
 */
export const phaseOn = (periods: Period[], date: DateStr, today: DateStr): Phase | null => {
  const sorted = sortPeriods(periods);
  const idx = sorted.findLastIndex((p) => p.start <= date);
  if (idx < 0) return null;
  const p = sorted[idx];
  if (inRange(date, p.start, effectiveEnd(p, today))) return 'menstrual';

  const next = sorted[idx + 1];
  const nextStart = next ? next.start : forecast(periods, today)!.nextStart;
  const ovulation = addDays(nextStart, -LUTEAL_DAYS);
  if (date < addDays(ovulation, -5)) return 'follicular';
  if (date <= addDays(ovulation, 1)) return 'ovulatory';
  return 'luteal';
};

/** Первые 2 дня после окончания месячных — подсказка про мажущие выделения */
export const isAfterPeriod = (periods: Period[], today: DateStr): boolean => {
  const last = lastPeriod(periods);
  if (!last || last.end === null) return false;
  const d = diffDays(today, last.end);
  return d >= 1 && d <= 2;
};

/* ---------------- Цвета дней в календаре ---------------- */

export type DayKind = 'period' | 'forecast' | 'ovulation' | 'fertile' | null;

/**
 * Как закрасить день. Отмеченные месячные важнее прогноза.
 * Прогноз месячных показываем только с сегодняшнего дня: прошедший день
 * без отметки — это не месячные. Фертильное окно и овуляцию текущего
 * цикла показываем и в прошлом, чтобы было видно, где они были.
 */
export const dayKind = (
  periods: Period[],
  date: DateStr,
  today: DateStr,
  f: Forecast | null = forecast(periods, today),
): DayKind => {
  if (isPeriodDay(periods, date, today)) return 'period';
  if (!f) return null;
  if (date >= today) {
    if (f.currentEnd && inRange(date, today, f.currentEnd)) return 'forecast';
    if (inRange(date, f.periodFrom, f.periodTo)) return 'forecast';
  }
  // Окно — только у текущего цикла: после начала последних месячных
  const last = lastPeriod(periods)!;
  if (date <= last.start) return null;
  if (date === f.ovulation) return 'ovulation';
  if (inRange(date, f.fertileFrom, f.fertileTo)) return 'fertile';
  return null;
};
