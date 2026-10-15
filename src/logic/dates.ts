// Даты храним строками 'YYYY-MM-DD' в локальном времени, без часовых поясов.
// Вся арифметика — через календарные дни date-fns, поэтому переход на
// летнее время и длина месяцев (28/29/30/31) учитываются сами.
import { addDays as addDaysFns, differenceInCalendarDays, format, parseISO } from 'date-fns';

export type DateStr = string;

export const toDate = (s: DateStr): Date => parseISO(s);
export const toStr = (d: Date): DateStr => format(d, 'yyyy-MM-dd');

export const addDays = (s: DateStr, n: number): DateStr => toStr(addDaysFns(toDate(s), n));

/** Сколько календарных дней от a до b (b − a) */
export const diffDays = (b: DateStr, a: DateStr): number =>
  differenceInCalendarDays(toDate(b), toDate(a));

export const yearOf = (s: DateStr): number => Number(s.slice(0, 4));

// Строки одного формата сравниваются как даты
export const isBefore = (a: DateStr, b: DateStr) => a < b;
export const inRange = (d: DateStr, from: DateStr, to: DateStr) => d >= from && d <= to;
