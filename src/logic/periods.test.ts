import { describe, expect, it } from 'vitest';
import { finishPeriod, startPeriod, toggleDay } from './periods';
import type { Period } from './types';

const ids = () => {
  let i = 0;
  return () => `new${++i}`;
};
const P = (id: string, start: string, end: string | null): Period => ({ id, start, end });
const today = '2026-10-15';
// Для сравнения без учёта id новых записей
const ranges = (ps: Period[]) => ps.map((p) => [p.start, p.end]);

describe('тап по дню: новые месячные', () => {
  it('на пустом календаре — месячные из одного дня', () => {
    expect(toggleDay([], '2026-10-10', today, ids())).toEqual([P('new1', '2026-10-10', '2026-10-10')]);
  });
  it('далеко от других месячных (через 2+ дня) — отдельные', () => {
    const r = toggleDay([P('a', '2026-10-01', '2026-10-05')], '2026-10-07', today, ids());
    expect(ranges(r)).toEqual([['2026-10-01', '2026-10-05'], ['2026-10-07', '2026-10-07']]);
  });
  it('будущий день не отмечается', () => {
    const before = [P('a', '2026-10-01', '2026-10-05')];
    expect(toggleDay(before, '2026-10-16', today)).toBe(before);
  });
  it('сегодняшний день отмечается', () => {
    expect(ranges(toggleDay([], today, today, ids()))).toEqual([[today, today]]);
  });
  it('результат отсортирован по дате начала', () => {
    const r = toggleDay([P('a', '2026-10-01', '2026-10-05')], '2026-09-01', today, ids());
    expect(r.map((p) => p.start)).toEqual(['2026-09-01', '2026-10-01']);
  });
});

describe('тап по дню: продление и склейка', () => {
  const base = [P('a', '2026-10-01', '2026-10-05')];
  it('день сразу после — продлевает конец', () => {
    expect(toggleDay(base, '2026-10-06', today)).toEqual([P('a', '2026-10-01', '2026-10-06')]);
  });
  it('день сразу до — сдвигает начало', () => {
    expect(toggleDay(base, '2026-09-30', today)).toEqual([P('a', '2026-09-30', '2026-10-05')]);
  });
  it('единственный день между двумя месячными — склеивает их', () => {
    const r = toggleDay([P('a', '2026-10-01', '2026-10-03'), P('b', '2026-10-05', '2026-10-07')], '2026-10-04', today);
    expect(r).toEqual([P('a', '2026-10-01', '2026-10-07')]);
  });
  it('склейка с идущими сейчас сохраняет end = null', () => {
    const r = toggleDay([P('a', '2026-10-10', '2026-10-11'), P('b', '2026-10-13', null)], '2026-10-12', today);
    expect(r).toEqual([P('a', '2026-10-10', null)]);
  });
  it('продление через границу месяца и года', () => {
    expect(toggleDay([P('a', '2026-09-28', '2026-09-30')], '2026-10-01', today)[0].end).toBe('2026-10-01');
    expect(toggleDay([P('a', '2026-12-29', '2026-12-31')], '2027-01-01', '2027-01-05')[0].end).toBe('2027-01-01');
    expect(toggleDay([P('a', '2027-01-01', '2027-01-03')], '2026-12-31', '2027-01-05')[0].start).toBe('2026-12-31');
  });
  it('продление через конец февраля (28 и 29 дней)', () => {
    expect(toggleDay([P('a', '2026-02-26', '2026-02-28')], '2026-03-01', today)[0].end).toBe('2026-03-01');
    const leap = toggleDay([P('a', '2028-02-26', '2028-02-28')], '2028-03-01', '2028-03-05', ids());
    expect(ranges(leap)).toEqual([['2028-02-26', '2028-02-28'], ['2028-03-01', '2028-03-01']]); // 29 фев между ними
    expect(toggleDay([P('a', '2028-02-26', '2028-02-28')], '2028-02-29', '2028-03-05')[0].end).toBe('2028-02-29');
  });
});

describe('тап по дню: снятие и разделение', () => {
  const base = [P('a', '2026-10-01', '2026-10-05')];
  it('первый день — укорачивает с начала', () => {
    expect(toggleDay(base, '2026-10-01', today)).toEqual([P('a', '2026-10-02', '2026-10-05')]);
  });
  it('последний день — укорачивает с конца', () => {
    expect(toggleDay(base, '2026-10-05', today)).toEqual([P('a', '2026-10-01', '2026-10-04')]);
  });
  it('день в середине — делит на две части', () => {
    const r = toggleDay(base, '2026-10-03', today, ids());
    expect(r).toEqual([P('a', '2026-10-01', '2026-10-02'), P('new1', '2026-10-04', '2026-10-05')]);
  });
  it('единственный день — удаляет месячные', () => {
    expect(toggleDay([P('a', '2026-10-01', '2026-10-01')], '2026-10-01', today)).toEqual([]);
  });
  it('повторный тап по только что отмеченному дню возвращает как было', () => {
    const once = toggleDay(base, '2026-10-06', today);
    expect(toggleDay(once, '2026-10-06', today)).toEqual(base);
  });
  it('середина идущих сейчас: вторая часть остаётся идущей', () => {
    const r = toggleDay([P('a', '2026-10-12', null)], '2026-10-13', today, ids());
    expect(r).toEqual([P('a', '2026-10-12', '2026-10-12'), P('new1', '2026-10-14', null)]);
  });
  it('снять сегодня у идущих сейчас — закончились вчера', () => {
    expect(toggleDay([P('a', '2026-10-12', null)], today, today)).toEqual([P('a', '2026-10-12', '2026-10-14')]);
  });
  it('идущие сейчас, начавшиеся сегодня, — снять сегодня удаляет их', () => {
    expect(toggleDay([P('a', today, null)], today, today)).toEqual([]);
  });
  it('исходный массив не меняется', () => {
    const input = [P('a', '2026-10-01', '2026-10-05')];
    const copy = structuredClone(input);
    toggleDay(input, '2026-10-03', today, ids());
    expect(input).toEqual(copy);
  });
});

describe('кнопки «Начались» / «Закончились»', () => {
  it('«Начались» — start = сегодня, end = null', () => {
    expect(startPeriod([], today, ids())).toEqual([P('new1', today, null)]);
  });
  it('«Начались», когда месячные уже идут, ничего не меняет', () => {
    const ps = [P('a', '2026-10-13', null)];
    expect(startPeriod(ps, today)).toEqual(ps);
  });
  it('«Начались», если вчера отмечен конец, — продолжает те же месячные', () => {
    expect(startPeriod([P('a', '2026-10-12', '2026-10-14')], today)).toEqual([P('a', '2026-10-12', null)]);
  });
  it('«Начались», если сегодня уже отмечено тапом, — делает их идущими', () => {
    expect(startPeriod([P('a', today, today)], today)).toEqual([P('a', today, null)]);
  });
  it('«Закончились» — end = сегодня', () => {
    expect(finishPeriod([P('a', '2026-10-12', null)], today)).toEqual([P('a', '2026-10-12', today)]);
  });
  it('«Закончились» без идущих месячных ничего не меняет', () => {
    const ps = [P('a', '2026-10-01', '2026-10-05')];
    expect(finishPeriod(ps, today)).toEqual(ps);
  });
});
