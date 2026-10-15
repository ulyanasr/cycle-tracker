// Что показать на главной — одной функцией, чтобы проверить тестами
import { cycleDay, isAfterPeriod, lastPeriod, phaseOn, status, yearStats, type Phase, type Status } from './cycle';
import { yearOf, type DateStr } from './dates';
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

/**
 * Кнопка в индиго-карточке:
 * - месячные идут (end = null) → «Закончились сегодня»;
 * - сегодня уже отмечено как последний день месячных → кнопки нет,
 *   они и так закончились сегодня;
 * - иначе → «Начались сегодня».
 */
export function periodButton(periods: Period[], today: DateStr): PeriodButton {
  const last = lastPeriod(periods);
  if (last?.end === null) return 'finish';
  if (last && last.end === today) return null;
  return 'start';
}

export function homeSummary(periods: Period[], today: DateStr): HomeSummary {
  const phase = phaseOn(periods, today, today);
  return {
    phase,
    cycleDay: cycleDay(periods, today),
    status: status(periods, today),
    avgCycle: yearStats(periods, yearOf(today)).avgCycle,
    body: phase ? (isAfterPeriod(periods, today) ? AFTER_PERIOD_TEXT : BODY_TEXT[phase]) : null,
    sport: phase ? SPORT_TEXT[phase] : null,
    button: periodButton(periods, today),
  };
}
