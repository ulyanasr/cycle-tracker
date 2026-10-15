import { describe, expect, it } from 'vitest';
import { backupBanner, backupFileName, isValidDate, makeBackup, parseBackup } from './backup';

const settings = { onboardingDone: true, lastExportAt: null, knownMedNames: ['Ибупрофен'] };
const good = () =>
  makeBackup(
    [
      { id: 'b', start: '2026-09-29', end: null },
      { id: 'a', start: '2026-09-01', end: '2026-09-05' },
    ],
    [{ date: '2026-09-02', flow: 'heavy', pain: 4, moods: ['Стресс'], meds: [{ name: 'Но-шпа', dose: '40 мг', time: '09:30' }], note: 'x' }],
    settings,
    new Date('2026-10-15T10:00:00Z'),
  );
const parse = (obj: unknown) => parseBackup(JSON.stringify(obj));
const errorOf = (obj: unknown) => {
  const r = parse(obj);
  return r.ok ? null : r.error;
};

describe('экспорт', () => {
  it('имя файла', () => {
    expect(backupFileName('2026-10-15')).toBe('cycle-backup-2026-10-15.json');
  });
  it('структура { version, exportedAt, periods, dayLogs, settings }', () => {
    expect(Object.keys(good())).toEqual(['version', 'exportedAt', 'periods', 'dayLogs', 'settings']);
    expect(good().exportedAt).toBe('2026-10-15T10:00:00.000Z');
  });
});

describe('импорт: корректный файл', () => {
  it('экспорт → импорт возвращает те же данные (месячные — по порядку)', () => {
    const r = parse(good());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.periods.map((p) => p.id)).toEqual(['a', 'b']);
    expect(r.backup.dayLogs).toEqual(good().dayLogs);
    expect(r.backup.settings).toEqual({ ...settings, lastExportAt: '2026-10-15T10:00:00.000Z' });
  });
  it('«последний бэкап» после импорта — не раньше даты самого файла', () => {
    const older = parse({ ...good(), settings: { ...settings, lastExportAt: '2026-09-01T00:00:00.000Z' } });
    expect(older.ok && older.backup.settings.lastExportAt).toBe('2026-10-15T10:00:00.000Z');
    const newer = parse({ ...good(), settings: { ...settings, lastExportAt: '2026-12-01T00:00:00.000Z' } });
    expect(newer.ok && newer.backup.settings.lastExportAt).toBe('2026-12-01T00:00:00.000Z');
  });
  it('после импорта первый запуск не показывается', () => {
    const b = { ...good(), settings: { ...settings, onboardingDone: false } };
    const r = parse(b);
    expect(r.ok && r.backup.settings.onboardingDone).toBe(true);
  });
  it('пустой бэкап — допустим', () => {
    expect(parse({ ...good(), periods: [], dayLogs: [] }).ok).toBe(true);
  });
});

describe('импорт: ошибки', () => {
  it('не JSON', () => {
    expect(parseBackup('привет')).toEqual({ ok: false, error: 'Это не файл бэкапа: не удалось прочитать JSON.' });
  });
  it('другая версия', () => {
    expect(errorOf({ ...good(), version: 2 })).toMatch(/версия/);
  });
  it('нет списков', () => {
    expect(errorOf({ ...good(), periods: undefined })).toMatch(/месячных/);
    expect(errorOf({ ...good(), dayLogs: 'x' })).toMatch(/дневника/);
  });
  it('несуществующая дата и конец раньше начала', () => {
    expect(errorOf({ ...good(), periods: [{ id: 'a', start: '2026-02-30', end: null }] })).toMatch(/дата начала/);
    expect(errorOf({ ...good(), periods: [{ id: 'a', start: '2026-09-05', end: '2026-09-01' }] })).toMatch(/раньше/);
  });
  it('пересекающиеся месячные и незаконченные не последние', () => {
    expect(errorOf({ ...good(), periods: [
      { id: 'a', start: '2026-09-01', end: '2026-09-05' }, { id: 'b', start: '2026-09-05', end: '2026-09-07' },
    ] })).toMatch(/пересекаются/);
    expect(errorOf({ ...good(), periods: [
      { id: 'a', start: '2026-09-01', end: null }, { id: 'b', start: '2026-09-29', end: null },
    ] })).toMatch(/не закончены/);
  });
  it('балл вне 1–5, неверная интенсивность, время', () => {
    expect(errorOf({ ...good(), dayLogs: [{ date: '2026-09-02', pain: 6 }] })).toMatch(/от 1 до 5/);
    expect(errorOf({ ...good(), dayLogs: [{ date: '2026-09-02', flow: 'big' }] })).toMatch(/интенсивность/);
    expect(errorOf({ ...good(), dayLogs: [{ date: '2026-09-02', meds: [{ name: 'А', time: '25:00' }] }] })).toMatch(/время/);
  });
  it('повторяющиеся даты в дневнике', () => {
    expect(errorOf({ ...good(), dayLogs: [{ date: '2026-09-02' }, { date: '2026-09-02' }] })).toMatch(/повторяются/);
  });
  it('лишние поля отбрасываются, пустые строки чистятся', () => {
    const r = parse({ ...good(), dayLogs: [{ date: '2026-09-02', note: '  ', hack: 1, meds: [{ name: ' А ', dose: '' }] }] });
    expect(r.ok && r.backup.dayLogs).toEqual([{ date: '2026-09-02', meds: [{ name: 'А' }] }]);
  });
});

describe('проверка даты', () => {
  it.each([
    ['2026-10-15', true], ['2028-02-29', true], ['2026-02-29', false], ['2026-13-01', false], ['26-10-15', false], [20261015, false],
  ])('%s → %s', (v, ok) => {
    expect(isValidDate(v)).toBe(ok);
  });
});

describe('баннер бэкапа', () => {
  it('нет данных — нет баннера', () => {
    expect(backupBanner('2026-10-01', null, false)).toBeNull();
  });
  it('1-го числа без экспорта в этом месяце — за прошлый месяц', () => {
    expect(backupBanner('2026-10-01', '2026-09-03T10:00:00', true)).toBe('Сохрани бэкап за сентябрь');
  });
  it('висит весь месяц, пока не было экспорта', () => {
    expect(backupBanner('2026-10-31', '2026-09-30T23:00:00', true)).toBe('Сохрани бэкап за сентябрь');
  });
  it('после экспорта в этом месяце — пропадает', () => {
    expect(backupBanner('2026-10-15', '2026-10-01T08:00:00', true)).toBeNull();
  });
  it('март после февраля 28 и 29 дней', () => {
    expect(backupBanner('2026-03-01', '2026-02-28T12:00:00', true)).toBe('Сохрани бэкап за февраль');
    expect(backupBanner('2028-03-01', '2028-02-29T12:00:00', true)).toBe('Сохрани бэкап за февраль');
    expect(backupBanner('2028-02-29', '2028-02-01T12:00:00', true)).toBeNull();
  });
  it('1–7 января — архив за прошлый год, с 8-го — бэкап за декабрь', () => {
    expect(backupBanner('2027-01-01', '2026-12-20T12:00:00', true)).toBe('Сохрани архив за 2026');
    expect(backupBanner('2027-01-07', null, true)).toBe('Сохрани архив за 2026');
    expect(backupBanner('2027-01-08', null, true)).toBe('Сохрани бэкап за декабрь');
  });
  it('экспорт в январе убирает и архив', () => {
    expect(backupBanner('2027-01-03', '2027-01-02T09:00:00', true)).toBeNull();
  });
});
