// Лента «Заметки» (5.4): записи дневника по месяцам, только заполненные строки
import { cycleDay, isPeriodDay } from './cycle';
import { toDate, yearOf, type DateStr } from './dates';
import { medDetails } from './meds';
import { capitalize, monthName, monthOf } from './months';
import { FLOW_LABEL } from './scales';
import type { DayLog, Period, Score } from './types';

export type NotesFilter = 'all' | 'pain' | 'meds';

/**
 * Краткие подписи баллов для карточки: «3 — заметная».
 * Это начало подписи из раздела 7 — до запятой или двоеточия.
 */
export const SHORT_LABELS: Record<'pain' | 'pms' | 'wellbeing', Record<Score, string>> = {
  pain: { 1: 'почти не чувствую', 2: 'лёгкая', 3: 'заметная', 4: 'сильная', 5: 'очень сильная' },
  pms: { 1: 'почти нет', 2: 'лёгкие проявления', 3: 'заметно мешает', 4: 'сильно влияет', 5: 'выбивает из жизни' },
  wellbeing: { 1: 'отлично', 2: 'хорошо', 3: 'так себе', 4: 'плохо', 5: 'очень плохо' },
};

export type NoteRow =
  | { label: string; kind: 'text'; text: string }
  | { label: string; kind: 'score'; score: Score; text: string };

export interface NoteCard {
  date: DateStr;
  title: string; // «14 окт, ср»
  isPeriod: boolean;
  cycleDay: number | null;
  rows: NoteRow[];
}

export interface NoteGroup {
  title: string; // «Октябрь» или «Декабрь 2025»
  cards: NoteCard[];
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export const shortDate = (date: DateStr) => {
  const { month } = monthOf(date);
  return `${Number(date.slice(8))} ${MONTHS_SHORT[month]}, ${WEEKDAYS_SHORT[toDate(date).getDay()]}`;
};

/** «Стресс, устала морально»: с заглавной только первое */
const joinMoods = (moods: string[]) =>
  moods.map((m, i) => (i === 0 ? m : m.charAt(0).toLowerCase() + m.slice(1))).join(', ');

export function noteRows(log: DayLog): NoteRow[] {
  const rows: NoteRow[] = [];
  if (log.flow) rows.push({ label: 'Месячные', kind: 'text', text: FLOW_LABEL[log.flow] });
  if (log.pain) rows.push({ label: 'Боль', kind: 'score', score: log.pain, text: SHORT_LABELS.pain[log.pain] });
  if (log.pms) rows.push({ label: 'ПМС', kind: 'score', score: log.pms, text: SHORT_LABELS.pms[log.pms] });
  if (log.wellbeing) {
    rows.push({ label: 'Самочувствие', kind: 'score', score: log.wellbeing, text: SHORT_LABELS.wellbeing[log.wellbeing] });
  }
  if (log.moods?.length) rows.push({ label: 'Состояние', kind: 'text', text: joinMoods(log.moods) });
  if (log.meds?.length) {
    const text = log.meds.map((m) => [m.name, medDetails(m)].filter(Boolean).join(' ')).join(', ');
    rows.push({ label: 'Лекарства', kind: 'text', text });
  }
  if (log.note) rows.push({ label: 'Заметка', kind: 'text', text: log.note });
  return rows;
}

const matches = (log: DayLog, filter: NotesFilter) =>
  filter === 'all' || (filter === 'pain' ? !!log.pain : !!log.meds?.length);

/** Группы по месяцам, новые сверху. Пустые записи не показываем */
export function notesFeed(logs: DayLog[], periods: Period[], today: DateStr, filter: NotesFilter): NoteGroup[] {
  const groups: NoteGroup[] = [];
  const sorted = [...logs].filter((l) => matches(l, filter)).sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const log of sorted) {
    const rows = noteRows(log);
    if (!rows.length) continue;
    const { year, month } = monthOf(log.date);
    const title = capitalize(monthName(month)) + (year === yearOf(today) ? '' : ` ${year}`);
    let group = groups[groups.length - 1];
    if (!group || group.title !== title) {
      group = { title, cards: [] };
      groups.push(group);
    }
    group.cards.push({
      date: log.date,
      title: shortDate(log.date),
      isPeriod: isPeriodDay(periods, log.date, today),
      cycleDay: cycleDay(periods, log.date),
      rows,
    });
  }
  return groups;
}
