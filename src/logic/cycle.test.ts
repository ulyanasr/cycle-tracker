import { describe, expect, it } from 'vitest';
import {
  completedCycles,
  cycleDay,
  dayKind,
  forecast,
  isAfterPeriod,
  isAtypical,
  phaseOn,
  status,
  windowStats,
  yearStats,
} from './cycle';
import { addDays, diffDays } from './dates';
import type { Period } from './types';

let n = 0;
const P = (start: string, end: string | null): Period => ({ id: `p${++n}`, start, end });

/** Месячные по 5 дней (если не указано): первые с start, дальше через длины циклов */
const build = (start: string, cycles: number[], len = 5): Period[] => {
  let s = start;
  const out = [P(s, addDays(s, len - 1))];
  for (const c of cycles) {
    s = addDays(s, c);
    out.push(P(s, addDays(s, len - 1)));
  }
  return out;
};

const kind = (ps: Period[], date: string, today: string) => dayKind(ps, date, today, forecast(ps));

/** Дни с данным цветом в календаре на отрезке from…to */
const daysOfKind = (periods: Period[], k: string, from: string, to: string, today: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (kind(periods, d, today) === k) out.push(d);
  return out;
};

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
  it('окно по умолчанию: 28 и 5, минимум = средний', () => {
    expect(windowStats([])).toEqual({ avgCycle: 28, minCycle: 28, avgPeriod: 5 });
  });
  it('статистика года без данных — «—»', () => {
    expect(yearStats([], 2026)).toEqual({ avgCycle: null, spread: null, avgPeriod: null });
  });
  it('прогноза, статуса, фазы и дня цикла нет', () => {
    expect(forecast([])).toBeNull();
    expect(status([], today)).toEqual({ kind: 'empty' });
    expect(phaseOn([], today, today)).toBeNull();
    expect(cycleDay([], today)).toBeNull();
    expect(kind([], today, today)).toBeNull();
  });
});

describe('одни месячные (ни одного завершённого цикла)', () => {
  const periods = [P('2026-10-01', '2026-10-04')];
  const today = '2026-10-15';

  it('цикл по умолчанию 28, месячные — по факту (4 дня)', () => {
    expect(windowStats(periods)).toMatchObject({ avgCycle: 28, minCycle: 28, avgPeriod: 4 });
  });
  it('прогноз: 1 окт + 28 = 29 окт, вероятные 29 окт – 1 ноя, возможных нет', () => {
    const f = forecast(periods)!;
    expect(f.nextStart).toBe('2026-10-29');
    expect(f.probableTo).toBe('2026-11-01'); // 29 окт + 4 − 1
    expect(f.possibleFrom).toBeNull();
  });
  it('овуляция = V − 14, окно = овуляция −5 … +1', () => {
    const f = forecast(periods)!;
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
    expect(windowStats(periods)).toMatchObject({ avgCycle: 29, minCycle: 29, avgPeriod: 5 });
    expect(yearStats(periods, 2026)).toEqual({ avgCycle: 29, spread: 0, avgPeriod: 5 });
  });
  it('прогноз от начала последних: 30 сен + 29 = 29 окт', () => {
    expect(forecast(periods)!.nextStart).toBe('2026-10-29');
  });
});

describe('разная длина циклов', () => {
  // Циклы: 26, 30, 28 → среднее 28, мин 26, макс 30, разброс ±2. Последние — 24 авг
  const periods = build('2026-06-01', [26, 30, 28]);
  const today = '2026-09-10';
  it('среднее и минимум окна, разброс за год', () => {
    expect(completedCycles(periods).map((c) => c.length)).toEqual([26, 30, 28]);
    expect(windowStats(periods)).toMatchObject({ avgCycle: 28, minCycle: 26 });
    expect(yearStats(periods, 2026)).toMatchObject({ avgCycle: 28, spread: 2 });
  });
  it('разброс округляется: циклы 27 и 30 → 1.5 → ±2', () => {
    expect(yearStats(build('2026-01-01', [27, 30]), 2026).spread).toBe(2);
  });
  it('среднее округляется до целого: 27 и 28 → 27.5 → 28', () => {
    expect(windowStats(build('2026-01-01', [27, 28])).avgCycle).toBe(28);
    expect(yearStats(build('2026-01-01', [27, 28]), 2026).avgCycle).toBe(28);
  });
  it('V = начало + средний; вероятные V … V+4; возможные от начала + мин до V − 1', () => {
    const f = forecast(periods)!;
    expect(f.nextStart).toBe('2026-09-21'); // 24 авг + 28
    expect(f.probableTo).toBe('2026-09-25'); // 21 сен + 5 − 1
    expect(f.possibleFrom).toBe('2026-09-19'); // 24 авг + 26
  });
  it('календарь: пунктир с ранней стороны, розовые с V, после прогноза — ничего', () => {
    expect(daysOfKind(periods, 'possible', '2026-09-11', '2026-10-05', today)).toEqual(['2026-09-19', '2026-09-20']);
    expect(daysOfKind(periods, 'forecast', '2026-09-11', '2026-10-05', today))
      .toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
    // Максимальный цикл (30 → 23 сен) не даёт пунктира после вероятных дней
    expect(kind(periods, '2026-09-26', today)).toBeNull();
    expect(kind(periods, '2026-09-27', today)).toBeNull();
  });
  it('первый вероятный день = день из «До месячных N дней»', () => {
    const s = status(periods, today);
    expect(s).toEqual({ kind: 'until', days: 11 });
    const cardDay = addDays(today, 11);
    expect(daysOfKind(periods, 'forecast', today, '2026-10-31', today)[0]).toBe(cardDay);
  });
  it('при задержке ранние возможные дни уже прошли и не рисуются', () => {
    expect(daysOfKind(periods, 'possible', '2026-09-01', '2026-10-05', '2026-09-23')).toEqual([]);
  });
});

describe('все циклы окна одной длины', () => {
  const periods = build('2026-07-01', [28, 28, 28]); // последние 23 сен
  const today = '2026-10-10';
  it('возможных дней нет, вероятных ровно столько, сколько средние месячные', () => {
    const f = forecast(periods)!;
    expect(f.possibleFrom).toBeNull();
    expect(daysOfKind(periods, 'possible', today, '2026-11-30', today)).toEqual([]);
    expect(daysOfKind(periods, 'forecast', today, '2026-11-30', today))
      .toEqual(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  });
  it('первый вероятный день = день из карточки', () => {
    const s = status(periods, today);
    expect(s.kind === 'until' && addDays(today, s.days)).toBe('2026-10-21');
  });
});

describe('окно из 6 последних циклов', () => {
  it('старый короткий цикл влияет на диапазон, пока он в окне', () => {
    const ps = build('2026-01-01', [22, 28, 28, 28, 28, 28]); // 6 циклов, 22 ещё в окне
    expect(windowStats(ps)).toMatchObject({ minCycle: 22 });
    expect(forecast(ps)!.possibleFrom).not.toBeNull();
  });
  it('после 6 новых циклов короткий выходит из окна, возможных дней больше нет', () => {
    const ps = build('2026-01-01', [22, 28, 28, 28, 28, 28, 28]);
    expect(windowStats(ps)).toMatchObject({ avgCycle: 28, minCycle: 28 });
    expect(forecast(ps)!.possibleFrom).toBeNull();
  });
  it('если циклов меньше 6 — по всем', () => {
    expect(windowStats(build('2026-01-01', [26, 30]))).toMatchObject({ avgCycle: 28, minCycle: 26 });
  });
  it('средние месячные — по последним 6 завершённым месячным', () => {
    // Первые двое месячных по 9 дней выходят из окна, остаются шесть по 5
    const ps = [...build('2026-01-01', [28], 9), ...build('2026-02-26', [28, 28, 28, 28, 28])];
    expect(windowStats(ps).avgPeriod).toBe(5);
  });
});

describe('нетипичные циклы (< 21 или > 45 дней)', () => {
  it('границы: 21 и 45 — типичные, 20 и 46 — нет', () => {
    expect([20, 21, 45, 46].map(isAtypical)).toEqual([true, false, false, true]);
  });
  // Циклы: 28, 10 (лишняя отметка), 28, 60 (пропуск), 30
  const ps = build('2026-01-05', [28, 10, 28, 60, 30]);
  it('не влияют на средний, минимум и разброс', () => {
    expect(windowStats(ps)).toMatchObject({ avgCycle: 29, minCycle: 28 });
    expect(yearStats(ps, 2026)).toMatchObject({ avgCycle: 29, spread: 1 });
  });
  it('прогноз строится по типичным циклам', () => {
    const last = ps[ps.length - 1].start;
    expect(forecast(ps)!.nextStart).toBe(addDays(last, 29));
  });
  it('если были только нетипичные — окно по умолчанию, год — «—»', () => {
    const only = build('2026-01-01', [10, 60]);
    expect(windowStats(only)).toMatchObject({ avgCycle: 28, minCycle: 28 });
    expect(yearStats(only, 2026)).toMatchObject({ avgCycle: null, spread: null });
  });
});

describe('возможные дни и фертильное окно', () => {
  // Циклы 21 и пять по 45 → средний round(246/6) = 41, мин 21
  const ps = build('2026-01-01', [21, 45, 45, 45, 45, 45]);
  const S = ps[ps.length - 1].start;
  const today = addDays(S, 15);
  it('при пересечении приоритет у фертильного окна и овуляции', () => {
    // Возможные: S+21 … S+40; овуляция S+27, окно S+22 … S+28
    expect(kind(ps, addDays(S, 21), today)).toBe('possible');
    expect(kind(ps, addDays(S, 22), today)).toBe('fertile');
    expect(kind(ps, addDays(S, 27), today)).toBe('ovulation');
    expect(kind(ps, addDays(S, 28), today)).toBe('fertile');
    expect(kind(ps, addDays(S, 29), today)).toBe('possible');
    expect(kind(ps, addDays(S, 41), today)).toBe('forecast');
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
    expect(kind(periods, '2026-10-16', today)).toBeNull();
    expect(kind(periods, '2026-10-17', today)).toBe('forecast');
    expect(kind(periods, '2026-10-19', today)).toBe('forecast');
  });
});

describe('месячные идут сейчас', () => {
  const periods = [P('2026-09-14', '2026-09-18'), P('2026-10-13', null)]; // цикл 29
  const today = '2026-10-15';
  it('статус: месячные, 3-й день', () => {
    expect(status(periods, today)).toEqual({ kind: 'period', day: 3 });
  });
  it('прогнозный конец = начало + средние − 1 (по завершённым: 5)', () => {
    const f = forecast(periods)!;
    expect(f.currentEnd).toBe('2026-10-17');
  });
  it('незавершённые месячные не влияют на среднюю длину', () => {
    expect(windowStats(periods)).toMatchObject({ avgPeriod: 5 });
  });
  it('календарь: отмечено по сегодня, дальше прогноз до конца', () => {
    expect(kind(periods, '2026-10-13', today)).toBe('period');
    expect(kind(periods, '2026-10-15', today)).toBe('period');
    expect(kind(periods, '2026-10-16', today)).toBe('forecast');
    expect(kind(periods, '2026-10-17', today)).toBe('forecast');
    expect(kind(periods, '2026-10-18', today)).toBeNull();
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
    expect(kind(periods, '2026-10-15', today)).toBe('ovulation');
    expect(kind(periods, '2026-10-10', today)).toBe('fertile');
    expect(kind(periods, '2026-10-16', today)).toBe('fertile');
    expect(kind(periods, '2026-09-17', today)).toBeNull();
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
    expect(forecast(p)!.nextStart).toBe('2027-01-05');
  });
  it('цикл относится к году, в котором начался', () => {
    const p = [
      P('2026-11-24', '2026-11-28'),
      P('2026-12-20', '2026-12-24'), // цикл 26, 2026
      P('2027-01-17', '2027-01-21'), // цикл 28, 2026 (начался 20 дек)
      P('2027-02-16', '2027-02-20'), // цикл 30, 2027
    ];
    expect(yearStats(p, 2026)).toMatchObject({ avgCycle: 27 });
    expect(yearStats(p, 2027)).toMatchObject({ avgCycle: 30 });
  });
  it('январь: прогноз по циклам прошлого года, без отката к 28/5', () => {
    const p = build('2026-10-01', [30, 30]); // последние 30 ноя, циклы по 30 в 2026
    expect(windowStats(p)).toMatchObject({ avgCycle: 30 });
    expect(forecast(p)!.nextStart).toBe('2026-12-30');
    expect(status(p, '2027-01-03')).toEqual({ kind: 'delay', days: 4 });
    // а статистика 2027 года пока пустая
    expect(yearStats(p, 2027)).toMatchObject({ avgCycle: null });
  });
});
