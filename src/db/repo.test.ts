import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toggleDay } from '../logic/periods';
import { CycleDB } from './db';
import {
  getAllDayLogs,
  getDayLog,
  getPeriods,
  getSettings,
  isEmptyDayLog,
  normalizeDayLog,
  addKnownMedName,
  replaceAll,
  saveDayLog,
  savePeriods,
  updatePeriods,
  updateSettings,
} from './repo';

let db: CycleDB;
let n = 0;
beforeEach(() => {
  db = new CycleDB(`test-${++n}`); // отдельная база на каждый тест
});
afterEach(async () => {
  await db.delete();
});

describe('месячные', () => {
  it('пустая база — пустой список', async () => {
    expect(await getPeriods(db)).toEqual([]);
  });
  it('возвращаются отсортированными по началу', async () => {
    await savePeriods(db, [
      { id: 'b', start: '2026-10-01', end: null },
      { id: 'a', start: '2026-09-03', end: '2026-09-07' },
    ]);
    expect((await getPeriods(db)).map((p) => p.id)).toEqual(['a', 'b']);
  });
  it('сохранение заменяет весь список (после склейки старых записей не остаётся)', async () => {
    await savePeriods(db, [
      { id: 'a', start: '2026-10-01', end: '2026-10-03' },
      { id: 'b', start: '2026-10-05', end: '2026-10-07' },
    ]);
    await savePeriods(db, [{ id: 'a', start: '2026-10-01', end: '2026-10-07' }]);
    expect(await getPeriods(db)).toEqual([{ id: 'a', start: '2026-10-01', end: '2026-10-07' }]);
  });
  it('два быстрых тапа подряд не затирают друг друга', async () => {
    const today = '2026-10-15';
    let i = 0;
    const id = () => `n${++i}`;
    // Запускаем одновременно, не дожидаясь первого
    await Promise.all([
      updatePeriods(db, (ps) => toggleDay(ps, '2026-10-01', today, id)),
      updatePeriods(db, (ps) => toggleDay(ps, '2026-10-02', today, id)),
    ]);
    expect((await getPeriods(db)).map((p) => [p.start, p.end])).toEqual([['2026-10-01', '2026-10-02']]);
  });
  it('end = null сохраняется как null', async () => {
    await savePeriods(db, [{ id: 'a', start: '2026-10-13', end: null }]);
    expect((await getPeriods(db))[0].end).toBeNull();
  });
});

describe('дневник дня', () => {
  it('сохраняется и читается по дате', async () => {
    await saveDayLog(db, { date: '2026-10-15', flow: 'heavy', pain: 3, moods: ['Стресс'] });
    expect(await getDayLog(db, '2026-10-15')).toEqual({
      date: '2026-10-15', flow: 'heavy', pain: 3, moods: ['Стресс'],
    });
  });
  it('пустые поля отбрасываются', () => {
    expect(
      normalizeDayLog({
        date: '2026-10-15', moods: [], note: '   ', meds: [{ name: '  ', dose: '400 мг' }],
      }),
    ).toEqual({ date: '2026-10-15' });
  });
  it('у лекарства обрезаются пробелы, пустая дозировка убирается', () => {
    expect(normalizeDayLog({ date: 'd', meds: [{ name: ' Ибупрофен ', dose: ' ', time: '09:30' }] }))
      .toEqual({ date: 'd', meds: [{ name: 'Ибупрофен', time: '09:30' }] });
  });
  it('пустой дневник не создаётся, а существующий — удаляется', async () => {
    expect(isEmptyDayLog({ date: 'd', note: '' })).toBe(true);
    await saveDayLog(db, { date: '2026-10-15', note: '' });
    expect(await getDayLog(db, '2026-10-15')).toBeUndefined();

    await saveDayLog(db, { date: '2026-10-15', pain: 2 });
    await saveDayLog(db, { date: '2026-10-15' }); // сняла все отметки
    expect(await getDayLog(db, '2026-10-15')).toBeUndefined();
  });
  it('повторное сохранение заменяет запись целиком (снятое поле исчезает)', async () => {
    await saveDayLog(db, { date: '2026-10-15', pain: 4, note: 'болит' });
    await saveDayLog(db, { date: '2026-10-15', note: 'болит' });
    expect(await getDayLog(db, '2026-10-15')).toEqual({ date: '2026-10-15', note: 'болит' });
  });
  it('после сохранения из подсказок пропадает опечатка, удалённая из всех записей', async () => {
    await addKnownMedName(db, 'Ибупрафен');
    await saveDayLog(db, { date: '2026-10-15', meds: [{ name: 'Ибупрафен' }] });
    expect((await getSettings(db)).knownMedNames).toEqual(['Ибупрафен']);
    // исправила опечатку в записи
    await addKnownMedName(db, 'Ибупрофен');
    await saveDayLog(db, { date: '2026-10-15', meds: [{ name: 'Ибупрофен' }] });
    expect((await getSettings(db)).knownMedNames).toEqual(['Ибупрофен']);
  });
  it('название, которое есть в другой записи, после сохранения остаётся', async () => {
    await addKnownMedName(db, 'Но-шпа');
    await saveDayLog(db, { date: '2026-10-14', meds: [{ name: 'Но-шпа' }] });
    await saveDayLog(db, { date: '2026-10-15', pain: 2 });
    expect((await getSettings(db)).knownMedNames).toEqual(['Но-шпа']);
  });
});

describe('настройки', () => {
  it('по умолчанию: онбординг не пройден, экспорта не было', async () => {
    expect(await getSettings(db)).toEqual({ onboardingDone: false, lastExportAt: null, knownMedNames: [] });
  });
  it('частичное обновление не затирает остальные поля', async () => {
    await updateSettings(db, { knownMedNames: ['Но-шпа'] });
    await updateSettings(db, { onboardingDone: true });
    expect(await getSettings(db)).toEqual({ onboardingDone: true, lastExportAt: null, knownMedNames: ['Но-шпа'] });
  });
  it('«Добавить» сразу запоминает название: первым, без дубля, в новом написании', async () => {
    await addKnownMedName(db, 'Ибупрофен');
    await addKnownMedName(db, 'Но-шпа');
    await addKnownMedName(db, ' ибупрофен ');
    expect((await getSettings(db)).knownMedNames).toEqual(['ибупрофен', 'Но-шпа']);
  });
});

describe('восстановление из бэкапа', () => {
  it('заменяет все данные, старые записи не остаются', async () => {
    await savePeriods(db, [{ id: 'old', start: '2026-01-01', end: '2026-01-05' }]);
    await saveDayLog(db, { date: '2026-01-02', pain: 2 });
    await replaceAll(db, {
      periods: [{ id: 'new', start: '2026-09-01', end: null }],
      dayLogs: [{ date: '2026-09-02', note: 'из файла' }],
      settings: { onboardingDone: true, lastExportAt: '2026-10-01T08:00:00.000Z', knownMedNames: ['Но-шпа'] },
    });
    expect(await getPeriods(db)).toEqual([{ id: 'new', start: '2026-09-01', end: null }]);
    expect(await getAllDayLogs(db)).toEqual([{ date: '2026-09-02', note: 'из файла' }]);
    expect(await getSettings(db)).toEqual({ onboardingDone: true, lastExportAt: '2026-10-01T08:00:00.000Z', knownMedNames: ['Но-шпа'] });
  });
});
