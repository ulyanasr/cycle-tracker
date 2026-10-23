import { describe, expect, it } from 'vitest';
import { archiveYears, barParts, yearCycles } from './history';
import type { Period } from './types';

const P = (start: string, end: string | null): Period => ({ id: start, start, end });
const today = '2026-10-14';
const periods = [P('2026-08-03', '2026-08-07'), P('2026-08-31', '2026-09-04'), P('2026-09-28', '2026-10-02')];

describe('циклы года', () => {
  it('новые сверху; конец = накануне следующих месячных; текущий идёт', () => {
    expect(yearCycles(periods, 2026, today)).toEqual([
      { start: '2026-09-28', end: null, days: 17, periodDays: 5, current: true, atypical: false, strayMarks: [] },
      { start: '2026-08-31', end: '2026-09-27', days: 28, periodDays: 5, current: false, atypical: false, strayMarks: [] },
      { start: '2026-08-03', end: '2026-08-30', days: 28, periodDays: 5, current: false, atypical: false, strayMarks: [] },
    ]);
  });
  it('месячные идут сейчас — длина по сегодня', () => {
    const c = yearCycles([P('2026-10-12', null)], 2026, today)[0];
    expect(c).toMatchObject({ periodDays: 3, days: 3, current: true });
  });
  it('цикл через Новый год — в году своего начала', () => {
    const ps = [P('2025-12-20', '2025-12-24'), P('2026-01-17', '2026-01-21')];
    expect(yearCycles(ps, 2025, today)).toEqual([
      { start: '2025-12-20', end: '2026-01-16', days: 28, periodDays: 5, current: false, atypical: false, strayMarks: [] },
    ]);
    expect(yearCycles(ps, 2026, today)[0]).toMatchObject({ start: '2026-01-17', current: true });
  });
  it('год без отметок — пусто', () => {
    expect(yearCycles(periods, 2024, today)).toEqual([]);
  });
});

describe('нетипичные циклы в истории', () => {
  it('короче 21 и длиннее 45 дней помечаются, но остаются в списке', () => {
    // 28, 10 (лишняя отметка), 211 (пропуск), идёт текущий
    const ps = [P('2026-01-05', '2026-01-09'), P('2026-02-02', '2026-02-06'), P('2026-02-12', '2026-02-13'), P('2026-09-11', '2026-09-15')];
    expect(yearCycles(ps, 2026, today).map((c) => [c.start, c.days, c.atypical])).toEqual([
      ['2026-09-11', 34, false],
      ['2026-02-12', 211, true],
      ['2026-02-02', 10, true],
      ['2026-01-05', 28, false],
    ]);
  });
});

describe('лишняя отметка в истории', () => {
  // 3 авг – 31 авг: лишний тап 20 авг не делит цикл
  const ps = [P('2026-08-03', '2026-08-06'), P('2026-08-20', '2026-08-20'), P('2026-09-01', '2026-09-04'), P('2026-09-29', '2026-10-02')];
  it('цикл вокруг отметки — обычный, длина без её учёта, дата отметки в подсказке', () => {
    const c = yearCycles(ps, 2026, today).find((x) => x.start === '2026-08-03')!;
    expect(c).toMatchObject({ end: '2026-08-31', days: 29, atypical: false, strayMarks: ['2026-08-20'] });
  });
  it('отметка не появляется отдельным циклом', () => {
    expect(yearCycles(ps, 2026, today).map((c) => c.start)).toEqual(['2026-09-29', '2026-09-01', '2026-08-03']);
  });
  it('лишняя отметка в идущем цикле тоже показывается', () => {
    const cur = yearCycles([...ps, P('2026-10-09', '2026-10-09')], 2026, today)[0];
    expect(cur).toMatchObject({ current: true, strayMarks: ['2026-10-09'] });
  });
});

describe('архив', () => {
  it('только прошлые годы, новые сверху', () => {
    const ps = [P('2024-05-01', '2024-05-05'), P('2025-12-20', '2025-12-24'), P('2026-01-17', null)];
    expect(archiveYears(ps, today)).toEqual([2025, 2024]);
  });
  it('нет прошлых лет', () => {
    expect(archiveYears(periods, today)).toEqual([]);
  });
});

describe('полоска', () => {
  const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 5);
  it('28 дней = 80% ширины, месячные 5/35', () => {
    const b = barParts({ days: 28, periodDays: 5 });
    close(b.period + b.rest, 0.8);
    close(b.period, 5 / 35);
  });
  it('длиннее 35 дней — 100%', () => {
    const b = barParts({ days: 48, periodDays: 5 });
    close(b.period + b.rest, 1);
  });
  it('идущий цикл — по прошедшим дням', () => {
    const b = barParts({ days: 25, periodDays: 4 });
    close(b.period + b.rest, 25 / 35);
  });
});
