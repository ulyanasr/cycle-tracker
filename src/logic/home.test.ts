import { describe, expect, it } from 'vitest';
import { homeSummary, periodButton } from './home';
import { AFTER_PERIOD_TEXT, BODY_TEXT } from './phaseTexts';
import type { Period } from './types';

const P = (start: string, end: string | null): Period => ({ id: start, start, end });
const today = '2026-10-15';

describe('главная', () => {
  it('нет данных: фазы и карточек нет, кнопка «Начались»', () => {
    expect(homeSummary([], today)).toMatchObject({
      phase: null, cycleDay: null, status: { kind: 'empty' }, avgCycle: 28, body: null, sport: null, button: 'start',
    });
  });
  it('лютеиновая фаза: текст и спорт по фазе', () => {
    const s = homeSummary([P('2026-09-01', '2026-09-05'), P('2026-09-29', '2026-10-02')], today);
    expect(s.phase).toBe('luteal');
    expect(s.cycleDay).toBe(17);
    expect(s.status).toEqual({ kind: 'until', days: 12 });
    expect(s.body).toBe(BODY_TEXT.luteal);
    expect(s.sport?.run).toBe('как обычно, к концу фазы легче');
  });
  it('1–2 дня после месячных — текст про выделения вместо текста фазы', () => {
    const ps = [P('2026-10-09', '2026-10-13')];
    expect(homeSummary(ps, '2026-10-14').body).toBe(AFTER_PERIOD_TEXT);
    expect(homeSummary(ps, '2026-10-15').body).toBe(AFTER_PERIOD_TEXT);
    expect(homeSummary(ps, '2026-10-16').body).toBe(BODY_TEXT.follicular);
  });
  it('месячные идут: менструальная фаза, кнопка «Закончились»', () => {
    const s = homeSummary([P('2026-10-13', null)], today);
    expect(s).toMatchObject({ phase: 'menstrual', status: { kind: 'period', day: 3 }, button: 'finish' });
  });
});

describe('кнопка в карточке', () => {
  it('месячные закончились вчера — «Начались» (продолжит их)', () => {
    expect(periodButton([P('2026-10-10', '2026-10-14')], today)).toBe('start');
  });
  it('сегодня отмечено последним днём — кнопки нет', () => {
    expect(periodButton([P('2026-10-12', today)], today)).toBeNull();
  });
});
