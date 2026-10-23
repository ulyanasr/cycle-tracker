// Расчёты цикла (раздел 4 спецификации). Только чистые функции:
// «сегодня» всегда передаётся параметром, чтобы тесты были детерминированы.
import { addDays, diffDays, inRange, yearOf, type DateStr } from './dates';
import type { Period } from './types';

export const DEFAULT_CYCLE = 28;
export const DEFAULT_PERIOD = 5;
export const LUTEAL_DAYS = 14;

/**
 * Нетипичный цикл: короче 21 или длиннее 45 дней. Чаще всего это случайная
 * лишняя или пропущенная отметка. Такие циклы показываются в истории, но не
 * участвуют ни в одном расчёте (средние, минимум, разброс).
 */
export const ATYPICAL_MIN_DAYS = 21;
export const ATYPICAL_MAX_DAYS = 45;
export const isAtypical = (cycleLength: number) =>
  cycleLength < ATYPICAL_MIN_DAYS || cycleLength > ATYPICAL_MAX_DAYS;

/** Прогноз строится по последним N типичным циклам, независимо от года */
export const FORECAST_WINDOW = 6;

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

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const periodLength = (p: Period) => diffDays(p.end as DateStr, p.start) + 1;

export interface WindowStats {
  avgCycle: number;
  minCycle: number;
  avgPeriod: number;
  /** Сколько типичных циклов и завершённых месячных попало в окно */
  cycleCount: number;
  periodCount: number;
}

/**
 * Окно прогноза: последние 6 типичных завершённых циклов и последние 6
 * завершённых месячных, независимо от календарного года — поэтому в январе
 * прогноз не откатывается к 28/5. Пока типичных циклов нет: 28 дней,
 * минимум = средний; пока нет завершённых месячных — 5 дней.
 * Это же значение «Средний цикл» на главной и в меню.
 */
export const windowStats = (periods: Period[]): WindowStats => {
  const cycles = completedCycles(periods)
    .filter((c) => !isAtypical(c.length))
    .slice(-FORECAST_WINDOW)
    .map((c) => c.length);
  const lengths = sortPeriods(periods)
    .filter((p) => p.end !== null)
    .slice(-FORECAST_WINDOW)
    .map(periodLength);

  const avgCycle = cycles.length ? Math.round(mean(cycles)) : DEFAULT_CYCLE;
  return {
    avgCycle,
    minCycle: cycles.length ? Math.min(...cycles) : avgCycle,
    avgPeriod: lengths.length ? Math.round(mean(lengths)) : DEFAULT_PERIOD,
    cycleCount: cycles.length,
    periodCount: lengths.length,
  };
};

export interface YearStats {
  /** null — в году нет типичных завершённых циклов (на экране «—») */
  avgCycle: number | null;
  /** ±N дней: (макс − мин) / 2 */
  spread: number | null;
  /** null — в году нет завершённых месячных */
  avgPeriod: number | null;
  cycleCount: number;
}

/**
 * Статистика за год — только для «Истории циклов». Цикл относится к году,
 * в котором начался; нетипичные не учитываются.
 */
export const yearStats = (periods: Period[], year: number): YearStats => {
  const cycles = completedCycles(periods)
    .filter((c) => yearOf(c.start) === year && !isAtypical(c.length))
    .map((c) => c.length);
  const lengths = periods.filter((p) => p.end !== null && yearOf(p.start) === year).map(periodLength);
  return {
    avgCycle: cycles.length ? Math.round(mean(cycles)) : null,
    spread: cycles.length ? Math.round((Math.max(...cycles) - Math.min(...cycles)) / 2) : null,
    avgPeriod: lengths.length ? Math.round(mean(lengths)) : null,
    cycleCount: cycles.length,
  };
};

/* ---------------- Прогноз на следующий цикл ---------------- */

export interface Forecast {
  /** V — наиболее вероятное начало: начало последних + средний цикл */
  nextStart: DateStr;
  /** Вероятные дни: V … V + средние месячные − 1 (розовые) */
  probableTo: DateStr;
  /**
   * Возможные дни — только с ранней стороны: от начала последних + минимальный
   * цикл до V − 1 (пунктир). null, если все циклы окна одной длины.
   */
  possibleFrom: DateStr | null;
  possibleTo: DateStr | null;
  /** Прогнозный конец идущих сейчас месячных (эти дни тоже вероятные), иначе null */
  currentEnd: DateStr | null;
  ovulation: DateStr;
  fertileFrom: DateStr;
  fertileTo: DateStr;
}

export const forecast = (periods: Period[], _today?: DateStr): Forecast | null => {
  const last = lastPeriod(periods);
  if (!last) return null;
  const s = windowStats(periods);

  const nextStart = addDays(last.start, s.avgCycle);
  const earliest = addDays(last.start, s.minCycle);
  const hasPossible = earliest < nextStart;
  const ovulation = addDays(nextStart, -LUTEAL_DAYS);
  return {
    nextStart,
    probableTo: addDays(nextStart, s.avgPeriod - 1),
    possibleFrom: hasPossible ? earliest : null,
    possibleTo: hasPossible ? addDays(nextStart, -1) : null,
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

export type DayKind = 'period' | 'forecast' | 'possible' | 'ovulation' | 'fertile' | null;

/**
 * Как закрасить день. Приоритет: отмеченные месячные → вероятные дни →
 * овуляция → фертильное окно → возможные дни.
 * Прогноз (вероятные и возможные) — только с сегодняшнего дня: прошедший день
 * без отметки — это не месячные. Фертильное окно и овуляцию текущего цикла
 * показываем и в прошлом, чтобы было видно, где они были.
 */
export const dayKind = (
  periods: Period[],
  date: DateStr,
  today: DateStr,
  f: Forecast | null = forecast(periods, today),
): DayKind => {
  if (isPeriodDay(periods, date, today)) return 'period';
  if (!f) return null;
  const future = date >= today;
  if (future) {
    if (f.currentEnd && inRange(date, today, f.currentEnd)) return 'forecast';
    if (inRange(date, f.nextStart, f.probableTo)) return 'forecast';
  }
  // Окно — только у текущего цикла: после начала последних месячных
  const last = lastPeriod(periods)!;
  if (date > last.start) {
    if (date === f.ovulation) return 'ovulation';
    if (inRange(date, f.fertileFrom, f.fertileTo)) return 'fertile';
  }
  if (future && f.possibleFrom && f.possibleTo && inRange(date, f.possibleFrom, f.possibleTo)) return 'possible';
  return null;
};
