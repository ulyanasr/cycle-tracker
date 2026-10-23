import { cycleDay, forecast, isAfterPeriod, phaseOn, status, windowStats, type Phase, type Status } from './cycle';
import type { DateStr } from './dates';
import { AFTER_PERIOD_TEXT, BODY_TEXT, PHASE_TITLE, SPORT_TEXT } from './phaseTexts';
import { daysLabel, plural } from './plural';
import type { Period } from './types';

export type PeriodButton = 'start' | 'finish' | null;

export interface HomeSummary {
  /** «Лютеиновая фаза» или «Задержка 2 дня»; null — отметок нет */
  title: string | null;
  /** Левая часть индиго-карточки */
  card: { label: string; value: string };
  phase: Phase | null;
  cycleDay: number | null;
  status: Status;
  avgCycle: number;
  body: string | null;
  sport: { run: string; strength: string; yoga: string } | null;
  button: PeriodButton;
}

export function cardText(s: Status): { label: string; value: string } {
  switch (s.kind) {
    case 'period':
      return { label: 'Месячные', value: `${s.day}-й день` };
    case 'delay':
      return { label: 'Задержка', value: `${s.days} дн.` };
    case 'until':
      return s.days === 0 ? { label: 'Ожидаются', value: 'сегодня' } : { label: 'До месячных', value: daysLabel(s.days) };
    default:
      return { label: 'До месячных', value: '—' };
  }
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
  const st = status(periods, today, f);
  // При задержке карточки «Тело» и «Спорт» — по лютеиновой фазе
  const phase = st.kind === 'delay' ? 'luteal' : phaseOn(periods, today, today, f);
  return {
    title: st.kind === 'delay' ? `Задержка ${st.days} ${plural(st.days, 'день', 'дня', 'дней')}` : phase && PHASE_TITLE[phase],
    card: cardText(st),
    phase,
    cycleDay: cycleDay(periods, today),
    status: st,
    avgCycle: stats.avgCycle,
    body: phase ? (isAfterPeriod(periods, today) ? AFTER_PERIOD_TEXT : BODY_TEXT[phase]) : null,
    sport: phase ? SPORT_TEXT[phase] : null,
    button: periodButton(periods, today),
  };
}
