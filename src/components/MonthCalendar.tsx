import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DayKind } from '../logic/cycle';
import { toDate, type DateStr } from '../logic/dates';
import { monthCells, type YearMonth } from '../logic/months';
import './MonthCalendar.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const KIND_LABEL: Record<Exclude<DayKind, null>, string> = {
  period: 'месячные',
  forecast: 'прогноз месячных',
  fertile: 'фертильное окно',
  ovulation: 'овуляция',
};

type Props = {
  month: YearMonth;
  kindOf: (date: DateStr) => DayKind;
  today: DateStr;
  onTap: (date: DateStr) => void;
  /** Заголовок с месяцем и, например, стрелками */
  header?: ReactNode;
};

// Сетка месяца: круги 40px. Будущие дни не нажимаются (раздел 4)
export function MonthCalendar({ month, kindOf, today, onTap, header }: Props) {
  return (
    <section className="month-cal">
      {header}
      <div className="cal-grid" role="grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-weekday" aria-hidden="true">{w}</span>
        ))}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const kind = kindOf(date);
          const isToday = date === today;
          const future = date > today;
          const label = [
            format(toDate(date), 'd MMMM', { locale: ru }),
            isToday ? 'сегодня' : '',
            kind ? KIND_LABEL[kind] : '',
          ].filter(Boolean).join(', ');
          return (
            <button
              key={date}
              className={`cal-day ${kind ? `is-${kind}` : ''} ${isToday ? 'is-today' : ''}`}
              disabled={future}
              aria-label={label}
              aria-pressed={kind === 'period'}
              onClick={() => onTap(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </section>
  );
}
