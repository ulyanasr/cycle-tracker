import { describe, expect, it } from 'vitest';
import {
  completedCycles,
  cycleDay,
  dayKind,
  forecast,
  isAfterPeriod,
  phaseOn,
  status,
  yearStats,
} from './cycle';
import { addDays, diffDays } from './dates';
import type { Period } from './types';

let n = 0;
const P = (start: string, end: string | null): Period => ({ id: `p${++n}`, start, end });

describe('даты', () => {
  it('февраль 28 дней (2026)', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(28);
  });
  it('февраль 29 дней (2028, високосный)', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(diffDays('2028-03-01', '2028-02-01')).toBe(29);
  });
  it('переход через год', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2027-01-05', '2026-12-20')).toBe(16);
  });
  it('переход на летнее/зимнее время не съедает день', () => {
    // Последнее воскресенье октября и марта — в Европе переводят часы
    expect(diffDays('2026-10-26', '2026-10-24')).toBe(2);
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
  });
});

describe('нет данных', () => {
  const today = '2026-10-15';
  it('средние по умолчанию: 28 и 5, разброс 0', () => {
    expect(yearStats([], 2026)).toEqual({
      avgCycle: 28, avgPeriod: 5, minCycle: 28, maxCycle: 28, spread: 0, cycleCount: 0, periodCount: 0,
    });
  });
  it('прогноза, статуса, фазы и дня цикла нет', () => {
    expect(forecast([], today)).toBeNull();
    expect(status([], today)).toEqual({ kind: 'empty' });
    expect(phaseOn([], today, today)).toBeNull();
    expect(cycleDay([], today)).toBeNull();
    expect(dayKind([], today, today)).toBeNull();
  });
});

describe('одни месячные (ни одного завершённого цикла)', () => {
  const periods = [P('2026-10-01', '2026-10-04')];
  const today = '2026-10-15';

  it('цикл по умолчанию 28, месячные — по факту (4 дня)', () => {
    const s = yearStats(periods, 2026);
    expect(s.avgCycle).toBe(28);
    expect(s.avgPeriod).toBe(4);
    expect(s.cycleCount).toBe(0);
  });
  it('прогноз: 1 окт + 28 = 29 окт, диапазон из одного дня', () => {
    const f = forecast(periods, today)!;
    expect(f.nextStart).toBe('2026-10-29');
    expect(f.rangeStart).toBe('2026-10-29');
    expect(f.rangeEnd).toBe('2026-10-29');
    expect(f.periodFrom).toBe('2026-10-29');
    expect(f.periodTo).toBe('2026-11-01'); // 29 окт + 4 − 1
  });
  it('овуляция = прогноз − 14, окно = овуляция −5 … +1', () => {
    const f = forecast(periods, today)!;
    expect(f.ovulation).toBe('2026-10-15');
    expect(f.fertileFrom).toBe('2026-10-10');
    expect(f.fertileTo).toBe('2026-10-16');
  });
  it('статус: до месячных 14 дней, 15-й день цикла', () => {
    expect(status(periods, today)).toEqual({ kind: 'until', days: 14 });
    expect(cycleDay(periods, today)).toBe(15);
  });
});

describe('один завершённый цикл', () => {
  const periods = [P('2026-09-01', '2026-09-05'), P('2026-09-30', '2026-10-03')];
  it('цикл 29 дней, месячные среднее (5+4)/2 = 4.5 → 5', () => {
    const s = yearStats(periods, 2026);
    expect(s.avgCycle).toBe(29);
    expect(s.avgPeriod).toBe(5);
    expect(s.spread).toBe(0);
    expect(s.cycleCount).toBe(1);
  });
  it('прогноз от начала последних: 30 сен + 29 = 29 окт', () => {
    expect(forecast(periods, '2026-10-10')!.nextStart).toBe('2026-10-29');
  });
});

describe('разная длина циклов', () => {
  // Циклы: 26, 30, 28 → среднее 28, мин 26, макс 30, разброс ±2
  const periods = [
    P('2026-06-01', '2026-06-05'),
    P('2026-06-27', '2026-07-01'),
    P('2026-07-27', '2026-07-31'),
    P('2026-08-24', '2026-08-28'),
  ];
  it('среднее, минимум, максимум, разброс', () => {
    expect(completedCycles(periods).map((c) => c.length)).toEqual([26, 30, 28]);
    const s = yearStats(periods, 2026);
    expect(s).toMatchObject({ avgCycle: 28, minCycle: 26, maxCycle: 30, spread: 2, cycleCount: 3 });
  });
  it('разброс округляется: циклы 27 и 30 → 1.5 → ±2', () => {
    const p = [P('2026-01-01', '2026-01-05'), P('2026-01-28', '2026-02-01'), P('2026-02-27', '2026-03-03')];
    expect(yearStats(p, 2026).spread).toBe(2);
  });
  it('среднее округляется до целого: 27 и 28 → 27.5 → 28', () => {
    const p = [P('2026-01-01', '2026-01-05'), P('2026-01-28', '2026-02-01'), P('2026-02-25', '2026-03-01')];
    expect(yearStats(p, 2026).avgCycle).toBe(28);
  });
  it('диапазон и прогнозные дни: от начала + мин до вероятного начала + средние − 1', () => {
    const f = forecast(periods, '2026-09-10')!;
    expect(f.nextStart).toBe('2026-09-21'); // 24 авг + 28
    expect(f.rangeStart).toBe('2026-09-19'); // + 26
    expect(f.rangeEnd).toBe('2026-09-23'); // + 30
    expect(f.periodFrom).toBe('2026-09-19');
    expect(f.periodTo).toBe('2026-09-25'); // 21 сен + 5 − 1
  });
  it('в календаре прогнозные дни закрашены с начала диапазона', () => {
    const today = '2026-09-10';
    expect(dayKind(periods, '2026-09-18', today)).toBeNull();
    expect(dayKind(periods, '2026-09-19', today)).toBe('forecast');
    expect(dayKind(periods, '2026-09-25', today)).toBe('forecast');
    expect(dayKind(periods, '2026-09-26', today)).toBeNull();
  });
});

describe('задержка', () => {
  const periods = [P('2026-08-20', '2026-08-24'), P('2026-09-17', '2026-09-21')]; // цикл 28
  it('прогноз 15 окт прошёл, сегодня 18 окт → задержка 3 дня', () => {
    expect(status(periods, '2026-10-15')).toEqual({ kind: 'until', days: 0 });
    expect(status(periods, '2026-10-18')).toEqual({ kind: 'delay', days: 3 });
  });
  it('в задержку день цикла продолжает расти, фаза лютеиновая', () => {
    expect(cycleDay(periods, '2026-10-18')).toBe(32);
    expect(phaseOn(periods, '2026-10-18', '2026-10-18')).toBe('luteal');
  });
  it('прошедшие прогнозные дни не закрашиваются, оставшиеся — да', () => {
    const today = '2026-10-17';
    expect(dayKind(periods, '2026-10-16', today)).toBeNull();
    expect(dayKind(periods, '2026-10-17', today)).toBe('forecast');
    expect(dayKind(periods, '2026-10-19', today)).toBe('forecast');
  });
});

describe('месячные идут сейчас', () => {
  const periods = [P('2026-09-14', '2026-09-18'), P('2026-10-13', null)]; // цикл 29
  const today = '2026-10-15';
  it('статус: месячные, 3-й день', () => {
    expect(status(periods, today)).toEqual({ kind: 'period', day: 3 });
  });
  it('прогнозный конец = начало + средние − 1 (по завершённым: 5)', () => {
    const f = forecast(periods, today)!;
    expect(f.currentEnd).toBe('2026-10-17');
  });
  it('незавершённые месячные не влияют на среднюю длину', () => {
    expect(yearStats(periods, 2026)).toMatchObject({ avgPeriod: 5, periodCount: 1 });
  });
  it('календарь: отмечено по сегодня, дальше прогноз до конца', () => {
    expect(dayKind(periods, '2026-10-13', today)).toBe('period');
    expect(dayKind(periods, '2026-10-15', today)).toBe('period');
    expect(dayKind(periods, '2026-10-16', today)).toBe('forecast');
    expect(dayKind(periods, '2026-10-17', today)).toBe('forecast');
    expect(dayKind(periods, '2026-10-18', today)).toBeNull();
  });
  it('фаза менструальная', () => {
    expect(phaseOn(periods, today, today)).toBe('menstrual');
  });
});

describe('фазы', () => {
  // Цикл 28: следующие 29 окт, овуляция 15 окт, окно 10–16 окт
  const periods = [P('2026-09-03', '2026-09-07'), P('2026-10-01', '2026-10-05')];
  const today = '2026-10-25';
  it.each([
    ['2026-10-01', 'menstrual'],
    ['2026-10-05', 'menstrual'],
    ['2026-10-06', 'follicular'],
    ['2026-10-09', 'follicular'],
    ['2026-10-10', 'ovulatory'],
    ['2026-10-16', 'ovulatory'],
    ['2026-10-17', 'luteal'],
    ['2026-10-25', 'luteal'],
  ])('%s → %s', (date, phase) => {
    expect(phaseOn(periods, date, today)).toBe(phase);
  });
  it('прошлый цикл считается от фактического начала следующих месячных', () => {
    // След. месячные 1 окт → овуляция 17 сен, окно 12–18 сен
    expect(phaseOn(periods, '2026-09-11', today)).toBe('follicular');
    expect(phaseOn(periods, '2026-09-12', today)).toBe('ovulatory');
    expect(phaseOn(periods, '2026-09-19', today)).toBe('luteal');
  });
  it('день до первых отмеченных месячных — фазы нет', () => {
    expect(phaseOn(periods, '2026-09-01', today)).toBeNull();
  });
  it('овуляция и окно в календаре, только в текущем цикле', () => {
    expect(dayKind(periods, '2026-10-15', today)).toBe('ovulation');
    expect(dayKind(periods, '2026-10-10', today)).toBe('fertile');
    expect(dayKind(periods, '2026-10-16', today)).toBe('fertile');
    expect(dayKind(periods, '2026-09-17', today)).toBeNull();
  });
  it('2 дня после месячных — подсказка про выделения', () => {
    expect(isAfterPeriod(periods, '2026-10-05')).toBe(false);
    expect(isAfterPeriod(periods, '2026-10-06')).toBe(true);
    expect(isAfterPeriod(periods, '2026-10-07')).toBe(true);
    expect(isAfterPeriod(periods, '2026-10-08')).toBe(false);
  });
});

describe('переход через месяц и год', () => {
  it('цикл через границу месяца', () => {
    const p = [P('2026-01-25', '2026-01-29'), P('2026-02-22', '2026-02-26')];
    expect(completedCycles(p)[0].length).toBe(28);
  });
  it('цикл через февраль 28 дней и 29 дней', () => {
    expect(completedCycles([P('2026-02-10', null), P('2026-03-10', null)])[0].length).toBe(28);
    expect(completedCycles([P('2028-02-10', null), P('2028-03-10', null)])[0].length).toBe(29);
  });
  it('прогноз через Новый год', () => {
    const p = [P('2026-11-10', '2026-11-14'), P('2026-12-08', '2026-12-12')]; // 28
    expect(forecast(p, '2026-12-20')!.nextStart).toBe('2027-01-05');
  });
  it('цикл относится к году, в котором начался', () => {
    const p = [
      P('2026-11-24', '2026-11-28'),
      P('2026-12-20', '2026-12-24'), // цикл 26, 2026
      P('2027-01-17', '2027-01-21'), // цикл 28, 2026 (начался 20 дек)
      P('2027-02-16', '2027-02-20'), // цикл 30, 2027
    ];
    expect(yearStats(p, 2026)).toMatchObject({ avgCycle: 27, cycleCount: 2 });
    expect(yearStats(p, 2027)).toMatchObject({ avgCycle: 30, cycleCount: 1 });
  });
  it('в начале года без циклов текущего года — средние по умолчанию (строго текущий год)', () => {
    const p = [P('2026-11-10', '2026-11-14'), P('2026-12-08', '2026-12-12')]; // цикл 28 в 2026
    const p2 = [P('2026-11-01', '2026-11-03'), P('2026-12-05', '2026-12-07')]; // цикл 34 в 2026
    expect(yearStats(p2, 2027)).toMatchObject({ avgCycle: 28, avgPeriod: 5, cycleCount: 0 });
    // Прогноз 3 января 2027 строится по 28 дням от 5 дек, а не по 34
    expect(forecast(p2, '2027-01-03')!.nextStart).toBe('2027-01-02');
    // 2 января прошло, а месячные не начались → задержка 1 день
    expect(status(p2, '2027-01-03')).toEqual({ kind: 'delay', days: 1 });
    expect(status(p, '2027-01-03')).toEqual({ kind: 'until', days: 2 });
  });
});
