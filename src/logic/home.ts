import { cycleDay, forecast, isAfterPeriod, phaseOn, status, windowStats, type Phase, type Status } from './cycle';
import type { DateStr } from './dates';
import { AFTER_PERIOD_TEXT, BODY_TEXT, SPORT_TEXT } from './phaseTexts';
import type { Period } from './types';

export type PeriodButton = 'start' | 'finish' | null;

export interface HomeSummary {
  phase: Phase | null;
  cycleDay: number | null;
  status: Status;
  avgCycle: number;
  body: string | null;
  sport: { run: string; strength: string; yoga: string } | null;
  button: PeriodButton;
}

/** Если сегодня уже отмечено последним днём месячных, кнопка не нужна */
export function periodButton(periods: Period[], today: DateStr): PeriodButton {
  const last = periods.at(-1);
  if (last?.end === null) return 'finish';
  return last?.end === today ? null : 'start';
}

export function homeSummary(periods: Period[], today: DateStr): HomeSummary {
  const stats = windowStats(periods);
  const f = forecast(periods, stats);
  const phase = phaseOn(periods, today, today, f);
  return {
    phase,
    cycleDay: cycleDay(periods, today),
    status: status(periods, today, f),
    avgCycle: stats.avgCycle,
    body: phase ? (isAfterPeriod(periods, today) ? AFTER_PERIOD_TEXT : BODY_TEXT[phase]) : null,
    sport: phase ? SPORT_TEXT[phase] : null,
    button: periodButton(periods, today),
  };
}
