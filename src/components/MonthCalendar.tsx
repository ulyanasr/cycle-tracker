import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ReactNode } from 'react';
import type { DayKind } from '../logic/cycle';
import { toDate, type DateStr } from '../logic/dates';
import { monthCells, type YearMonth } from '../logic/months';
import './MonthCalendar.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const KIND_LABEL: Record<Exclude<DayKind, null>, string> = {
  period: 'месячные',
  forecast: 'прогноз месячных',
  possible: 'возможно начало месячных',
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
  /** Режим «Изменить»: дни до сегодня в пунктире, будущие бледнее */
  editing?: boolean;
  /** Что объявлять экранному диктору: отметка месячных или открытие дневника */
  pressable?: boolean;
};

export function MonthCalendar({ month, kindOf, today, onTap, header, editing = false, pressable = true }: Props) {
  return (
    <section className={`month-cal ${editing ? 'is-editing' : ''}`}>
      {header}
      <div className="cal-grid">
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
              aria-pressed={pressable ? kind === 'period' : undefined}
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
