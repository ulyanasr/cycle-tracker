import { describe, expect, it } from 'vitest';
import { archiveYears, barParts, yearCycles } from './history';
import type { Period } from './types';

const P = (start: string, end: string | null): Period => ({ id: start, start, end });
const today = '2026-10-14';
const periods = [P('2026-08-03', '2026-08-07'), P('2026-08-31', '2026-09-04'), P('2026-09-28', '2026-10-02')];

describe('циклы года', () => {
  it('новые сверху; конец = накануне следующих месячных; текущий идёт', () => {
    expect(yearCycles(periods, 2026, today)).toEqual([
      { start: '2026-09-28', end: null, days: 17, periodDays: 5, current: true, expected: 28 },
      { start: '2026-08-31', end: '2026-09-27', days: 28, periodDays: 5, current: false, expected: null },
      { start: '2026-08-03', end: '2026-08-30', days: 28, periodDays: 5, current: false, expected: null },
    ]);
  });
  it('месячные идут сейчас — длина по сегодня', () => {
    const c = yearCycles([P('2026-10-12', null)], 2026, today)[0];
    expect(c).toMatchObject({ periodDays: 3, days: 3, current: true });
  });
  it('цикл через Новый год — в году своего начала', () => {
    const ps = [P('2025-12-20', '2025-12-24'), P('2026-01-17', '2026-01-21')];
    expect(yearCycles(ps, 2025, today)).toEqual([
      { start: '2025-12-20', end: '2026-01-16', days: 28, periodDays: 5, current: false, expected: null },
    ]);
    expect(yearCycles(ps, 2026, today)[0]).toMatchObject({ start: '2026-01-17', current: true });
  });
  it('год без отметок — пусто', () => {
    expect(yearCycles(periods, 2024, today)).toEqual([]);
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
  it('28 дней = 80% ширины, месячные 5/28 от неё', () => {
    const b = barParts({ start: '', end: '', days: 28, periodDays: 5, current: false, expected: null });
    close(b.period + b.rest, 0.8);
    close(b.period, 5 / 35);
    close(b.remaining, 0);
  });
  it('длиннее 35 дней — не шире 100%', () => {
    const b = barParts({ start: '', end: '', days: 42, periodDays: 5, current: false, expected: null });
    close(b.period + b.rest + b.remaining, 1);
  });
  it('текущий: прошедшее + серый остаток до ожидаемой длины', () => {
    const b = barParts({ start: '', end: null, days: 17, periodDays: 5, current: true, expected: 28 });
    close(b.period, 5 / 35);
    close(b.rest, 12 / 35);
    close(b.remaining, 11 / 35);
  });
  it('текущий в задержке — серого нет', () => {
    const b = barParts({ start: '', end: null, days: 31, periodDays: 5, current: true, expected: 28 });
    close(b.remaining, 0);
  });
});
