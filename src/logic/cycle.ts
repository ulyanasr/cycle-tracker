// Расчёты цикла (раздел 4). periods всегда отсортированы по start — так их отдаёт база.
import { addDays, diffDays, inRange, yearOf, type DateStr } from './dates';
import type { Period } from './types';

export const DEFAULT_CYCLE = 28;
export const DEFAULT_PERIOD = 5;
export const FORECAST_WINDOW = 6;
const LUTEAL_DAYS = 14;

// Циклы короче 21 или длиннее 45 дней — обычно ошибка в отметках, в расчётах не участвуют
export const ATYPICAL_MIN_DAYS = 21;
export const ATYPICAL_MAX_DAYS = 45;

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export const isAtypical = (days: number) => days < ATYPICAL_MIN_DAYS || days > ATYPICAL_MAX_DAYS;

export const byStart = (a: Period, b: Period) => a.start.localeCompare(b.start);

/** Для идущих сейчас месячных последний день — сегодня */
export const effectiveEnd = (p: Period, today: DateStr) => p.end ?? today;

export interface Cycle {
  start: DateStr;
  length: number;
}

/** Длина цикла — от начала одних месячных до начала следующих */
export const completedCycles = (periods: Period[]): Cycle[] =>
  periods.slice(1).map((p, i) => ({ start: periods[i].start, length: diffDays(p.start, periods[i].start) }));

const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
const typicalLengths = (cycles: Cycle[]) => cycles.map((c) => c.length).filter((d) => !isAtypical(d));
const finishedLengths = (periods: Period[]) =>
  periods.filter((p) => p.end !== null).map((p) => diffDays(p.end!, p.start) + 1);

export interface WindowStats {
  avgCycle: number;
  minCycle: number;
  avgPeriod: number;
}

/** По последним 6 типичным циклам и 6 завершённым месячным, без привязки к году */
export function windowStats(periods: Period[]): WindowStats {
  const cycles = typicalLengths(completedCycles(periods)).slice(-FORECAST_WINDOW);
  const lengths = finishedLengths(periods).slice(-FORECAST_WINDOW);
  const avgCycle = cycles.length ? average(cycles) : DEFAULT_CYCLE;
  return {
    avgCycle,
    minCycle: cycles.length ? Math.min(...cycles) : avgCycle,
    avgPeriod: lengths.length ? average(lengths) : DEFAULT_PERIOD,
  };
}

/** Для «Истории циклов»: цикл относится к году своего начала. null — показать «—» */
export function yearStats(periods: Period[], year: number) {
  const cycles = typicalLengths(completedCycles(periods).filter((c) => yearOf(c.start) === year));
  const lengths = finishedLengths(periods.filter((p) => yearOf(p.start) === year));
  return {
    avgCycle: cycles.length ? average(cycles) : null,
    spread: cycles.length ? Math.round((Math.max(...cycles) - Math.min(...cycles)) / 2) : null,
    avgPeriod: lengths.length ? average(lengths) : null,
  };
}

export interface Forecast {
  lastStart: DateStr;
  /** V — наиболее вероятное начало следующих месячных */
  nextStart: DateStr;
  /** Последний вероятный день: V + средние месячные − 1 */
  probableTo: DateStr;
  /** Первый возможный день (пунктир до V − 1); null, если циклы окна одной длины */
  possibleFrom: DateStr | null;
  /** Прогнозный конец идущих сейчас месячных */
  currentEnd: DateStr | null;
  ovulation: DateStr;
  fertileFrom: DateStr;
  fertileTo: DateStr;
}

export function forecast(periods: Period[], stats = windowStats(periods)): Forecast | null {
  const last = periods.at(-1);
  if (!last) return null;
  const nextStart = addDays(last.start, stats.avgCycle);
  const ovulation = addDays(nextStart, -LUTEAL_DAYS);
  return {
    lastStart: last.start,
    nextStart,
    probableTo: addDays(nextStart, stats.avgPeriod - 1),
    possibleFrom: stats.minCycle < stats.avgCycle ? addDays(last.start, stats.minCycle) : null,
    currentEnd: last.end === null ? addDays(last.start, stats.avgPeriod - 1) : null,
    ovulation,
    fertileFrom: addDays(ovulation, -5),
    fertileTo: addDays(ovulation, 1),
  };
}

export const isPeriodDay = (periods: Period[], date: DateStr, today: DateStr) =>
  periods.some((p) => inRange(date, p.start, effectiveEnd(p, today)));

export function cycleDay(periods: Period[], date: DateStr): number | null {
  const p = periods.findLast((p) => p.start <= date);
  return p ? diffDays(date, p.start) + 1 : null;
}

export type Status =
  | { kind: 'empty' }
  | { kind: 'period'; day: number }
  | { kind: 'until'; days: number }
  | { kind: 'delay'; days: number };

export function status(periods: Period[], today: DateStr, f = forecast(periods)): Status {
  const last = periods.at(-1);
  if (!last || !f) return { kind: 'empty' };
  if (inRange(today, last.start, effectiveEnd(last, today))) {
    return { kind: 'period', day: diffDays(today, last.start) + 1 };
  }
  const left = diffDays(f.nextStart, today);
  return left < 0 ? { kind: 'delay', days: -left } : { kind: 'until', days: left };
}

/** Для прошлых циклов овуляция считается от фактического начала следующих месячных */
export function phaseOn(periods: Period[], date: DateStr, today: DateStr, f = forecast(periods)): Phase | null {
  const i = periods.findLastIndex((p) => p.start <= date);
  if (i < 0) return null;
  if (inRange(date, periods[i].start, effectiveEnd(periods[i], today))) return 'menstrual';

  const ovulation = addDays(periods[i + 1]?.start ?? f!.nextStart, -LUTEAL_DAYS);
  if (date < addDays(ovulation, -5)) return 'follicular';
  if (date <= addDays(ovulation, 1)) return 'ovulatory';
  return 'luteal';
}

/** Первые 2 дня после месячных — подсказка про мажущие выделения */
export function isAfterPeriod(periods: Period[], today: DateStr): boolean {
  const end = periods.at(-1)?.end;
  if (!end) return false;
  const d = diffDays(today, end);
  return d >= 1 && d <= 2;
}

export type DayKind = 'period' | 'forecast' | 'possible' | 'ovulation' | 'fertile' | null;

/**
 * Приоритет: месячные → вероятные → овуляция → фертильное окно → возможные.
 * Прогноз не рисуется на прошедших днях: день без отметки — это не месячные.
 * Окно текущего цикла видно и в прошлом.
 */
export function dayKind(periods: Period[], date: DateStr, today: DateStr, f: Forecast | null): DayKind {
  if (isPeriodDay(periods, date, today)) return 'period';
  if (!f) return null;
  const future = date >= today;
  if (future && (inRange(date, f.nextStart, f.probableTo) || (f.currentEnd && date <= f.currentEnd))) {
    return 'forecast';
  }
  if (date > f.lastStart) {
    if (date === f.ovulation) return 'ovulation';
    if (inRange(date, f.fertileFrom, f.fertileTo)) return 'fertile';
  }
  if (future && f.possibleFrom && date >= f.possibleFrom && date < f.nextStart) return 'possible';
  return null;
}
