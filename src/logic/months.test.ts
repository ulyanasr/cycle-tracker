import { describe, expect, it } from 'vitest';
import { monthCells, monthNameIn, previousTwoMonths, shiftMonth } from './months';

describe('месяцы', () => {
  it('два предыдущих месяца: в октябре — август и сентябрь', () => {
    expect(previousTwoMonths('2026-10-15')).toEqual([{ year: 2026, month: 7 }, { year: 2026, month: 8 }]);
  });
  it('в январе и феврале — через границу года', () => {
    expect(previousTwoMonths('2027-01-03')).toEqual([{ year: 2026, month: 10 }, { year: 2026, month: 11 }]);
    expect(previousTwoMonths('2027-02-28')).toEqual([{ year: 2026, month: 11 }, { year: 2027, month: 0 }]);
  });
  it('сдвиг назад и вперёд через год', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });
  it('предложный падеж', () => {
    expect(monthNameIn(7)).toBe('августе');
    expect(monthNameIn(4)).toBe('мае');
  });
});

describe('сетка месяца с понедельника', () => {
  it('август 2026 начинается в субботу — 5 пустых ячеек, 31 день', () => {
    const cells = monthCells({ year: 2026, month: 7 });
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(cells[5]).toBe('2026-08-01');
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.at(-1)).toBe('2026-08-31');
  });
  it('месяц, начинающийся в понедельник, — без пустых ячеек (июнь 2026)', () => {
    expect(monthCells({ year: 2026, month: 5 })[0]).toBe('2026-06-01');
  });
  it('месяц, начинающийся в воскресенье, — 6 пустых (ноябрь 2026)', () => {
    expect(monthCells({ year: 2026, month: 10 }).indexOf('2026-11-01')).toBe(6);
  });
  it('февраль 28 и 29 дней', () => {
    expect(monthCells({ year: 2026, month: 1 }).filter(Boolean)).toHaveLength(28);
    expect(monthCells({ year: 2028, month: 1 }).filter(Boolean)).toHaveLength(29);
  });
});
