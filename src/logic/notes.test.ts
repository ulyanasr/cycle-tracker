import { describe, expect, it } from 'vitest';
import { noteRows, notesFeed, shortDate } from './notes';
import type { DayLog, Period } from './types';

const today = '2026-10-15';
const periods: Period[] = [
  { id: 'a', start: '2026-09-28', end: '2026-10-02' },
];
const logs: DayLog[] = [
  { date: '2026-09-29', flow: 'heavy', pain: 4, meds: [{ name: 'Но-шпа', dose: '40 мг' }], note: 'Лёгкая пробежка' },
  { date: '2026-10-14', pain: 3, moods: ['Стресс', 'Устала морально'], meds: [{ name: 'Ибупрофен', dose: '400 мг', time: '09:30' }] },
  { date: '2026-10-02', flow: 'light', pain: 2, moods: ['Спокойная'] },
  { date: '2025-12-30', moods: ['Норм'] },
];

describe('карточка записи', () => {
  it('дата «14 окт, ср», «2 мая, сб»', () => {
    expect(shortDate('2026-10-14')).toBe('14 окт, ср');
    expect(shortDate('2026-05-02')).toBe('2 мая, сб');
  });
  it('только заполненные строки, в порядке спецификации', () => {
    expect(noteRows(logs[0]).map((r) => r.label)).toEqual(['Месячные', 'Боль', 'Лекарства', 'Заметка']);
  });
  it('тексты строк: интенсивность, балл, состояние, лекарства', () => {
    const rows = noteRows(logs[1]);
    expect(rows).toEqual([
      { label: 'Боль', kind: 'score', score: 3, text: 'заметная' },
      { label: 'Состояние', kind: 'text', text: 'Стресс, устала морально' },
      { label: 'Лекарства', kind: 'text', text: 'Ибупрофен 400 мг · 09:30' },
    ]);
    expect(noteRows(logs[0])[0]).toEqual({ label: 'Месячные', kind: 'text', text: 'Обильные' });
  });
  it('ПМС и самочувствие', () => {
    expect(noteRows({ date: 'd', pms: 2, wellbeing: 3 })).toEqual([
      { label: 'ПМС', kind: 'score', score: 2, text: 'лёгкий' },
      { label: 'Самочувствие', kind: 'score', score: 3, text: 'так себе' },
    ]);
  });
  it('несколько лекарств — через запятую, без пустых частей', () => {
    expect(noteRows({ date: 'd', meds: [{ name: 'А', time: '08:00' }, { name: 'Б' }] })[0].text).toBe('А 08:00, Б');
  });
});

describe('лента', () => {
  it('по месяцам, новые сверху; прошлый год с подписью года', () => {
    const feed = notesFeed(logs, periods, today, 'all');
    expect(feed.map((g) => [g.title, g.cards.map((c) => c.date)])).toEqual([
      ['Октябрь', ['2026-10-14', '2026-10-02']],
      ['Сентябрь', ['2026-09-29']],
      ['Декабрь 2025', ['2025-12-30']],
    ]);
  });
  it('красная точка в дни месячных и день цикла', () => {
    const [oct, sep] = notesFeed(logs, periods, today, 'all');
    expect(oct.cards.map((c) => [c.isPeriod, c.cycleDay])).toEqual([[false, 17], [true, 5]]);
    expect(sep.cards[0]).toMatchObject({ isPeriod: true, cycleDay: 2 });
  });
  it('до первых отмеченных месячных дня цикла нет', () => {
    expect(notesFeed(logs, periods, today, 'all')[2].cards[0].cycleDay).toBeNull();
  });
  it('фильтр «С болью»', () => {
    expect(notesFeed(logs, periods, today, 'pain').flatMap((g) => g.cards.map((c) => c.date)))
      .toEqual(['2026-10-14', '2026-10-02', '2026-09-29']);
  });
  it('фильтр «С лекарствами»', () => {
    expect(notesFeed(logs, periods, today, 'meds').flatMap((g) => g.cards.map((c) => c.date)))
      .toEqual(['2026-10-14', '2026-09-29']);
  });
  it('нет записей — пустая лента', () => {
    expect(notesFeed([], periods, today, 'all')).toEqual([]);
  });
});
