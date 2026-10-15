// Месяцы для календаря и текстов первого запуска
import { getDaysInMonth } from 'date-fns';
import { toStr, type DateStr } from './dates';

// Падежи, которых нет в date-fns: «в августе», «Август 2026», «за август»
const NOMINATIVE = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const PREPOSITIONAL = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

/** month: 0–11 */
export const monthName = (month: number) => NOMINATIVE[month];
export const monthNameIn = (month: number) => PREPOSITIONAL[month];
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface YearMonth {
  year: number;
  month: number; // 0–11
}

/** Сдвиг на n месяцев, через границу года */
export function shiftMonth({ year, month }: YearMonth, n: number): YearMonth {
  const total = year * 12 + month + n;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export const monthOf = (date: DateStr): YearMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)) - 1,
});

/** Два предыдущих календарных месяца относительно даты, старший первым */
export const previousTwoMonths = (today: DateStr): [YearMonth, YearMonth] => {
  const cur = monthOf(today);
  return [shiftMonth(cur, -2), shiftMonth(cur, -1)];
};

/**
 * Ячейки сетки месяца, неделя с понедельника.
 * null — пустая ячейка перед первым числом.
 */
export function monthCells({ year, month }: YearMonth): (DateStr | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // getDay: 0 = вс → сдвигаем к пн
  const days = getDaysInMonth(first);
  const cells: (DateStr | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toStr(new Date(year, month, d)));
  return cells;
}
