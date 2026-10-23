// Чтение и запись данных. Экраны ходят в базу только через эти функции
import type { CycleDB } from './db';
import { compact } from '../logic/compact';
import { pruneMedNames, rememberMedName } from '../logic/meds';
import type { DayLog, Period, Settings } from '../logic/types';

export const DEFAULT_SETTINGS: Settings = {
  onboardingDone: false,
  lastExportAt: null,
  knownMedNames: [],
};

export const getPeriods = (db: CycleDB): Promise<Period[]> => db.periods.orderBy('start').toArray();

/**
 * Правка месячных целиком (они могут склеиться или разделиться): чтение и
 * запись в одной транзакции, поэтому два быстрых тапа подряд не затрут друг друга.
 */
export async function updatePeriods(
  db: CycleDB,
  change: (periods: Period[]) => Period[],
): Promise<void> {
  await db.transaction('rw', db.periods, async () => {
    const next = change(await getPeriods(db));
    await db.periods.clear();
    await db.periods.bulkPut(next);
  });
}

export const getDayLog = (db: CycleDB, date: string): Promise<DayLog | undefined> =>
  db.dayLogs.get(date);

export const getAllDayLogs = (db: CycleDB): Promise<DayLog[]> => db.dayLogs.toArray();

export const normalizeDayLog = (log: DayLog): DayLog =>
  compact({
    ...log,
    meds: log.meds
      ?.map((m) => compact({ name: m.name.trim(), dose: m.dose?.trim(), time: m.time }))
      .filter((m) => m.name),
    note: log.note?.trim(),
  });

/** Есть ли в записи что-то кроме даты */
const hasContent = (log: DayLog) => Object.keys(log).length > 1;

/**
 * Пустой дневник удаляется, чтобы в «Заметках» не было пустых карточек.
 * После записи из подсказок убираются названия, которых больше нет ни в одной записи.
 */
export async function saveDayLog(db: CycleDB, log: DayLog): Promise<void> {
  const clean = normalizeDayLog(log);
  await db.transaction('rw', db.dayLogs, db.settings, async () => {
    if (hasContent(clean)) await db.dayLogs.put(clean);
    else await db.dayLogs.delete(clean.date);
    const logs = await db.dayLogs.toArray();
    await updateSettings(db, (s) => ({ knownMedNames: pruneMedNames(s.knownMedNames, logs) }));
  });
}

export async function getSettings(db: CycleDB): Promise<Settings> {
  const row = await db.settings.get('app');
  if (!row) return { ...DEFAULT_SETTINGS };
  const { key: _key, ...rest } = row;
  return { ...DEFAULT_SETTINGS, ...rest };
}

/** patch — сами поля или функция от текущих настроек */
export async function updateSettings(
  db: CycleDB,
  patch: Partial<Settings> | ((s: Settings) => Partial<Settings>),
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const cur = await getSettings(db);
    await db.settings.put({ key: 'app', ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) });
  });
}

/** «Добавить» в форме лекарства: название сразу попадает в подсказки */
export const addKnownMedName = (db: CycleDB, name: string) =>
  updateSettings(db, (s) => ({ knownMedNames: rememberMedName(name.trim(), s.knownMedNames) }));

/** Восстановление из бэкапа: полная замена одной транзакцией — либо всё, либо ничего */
export async function replaceAll(
  db: CycleDB,
  data: { periods: Period[]; dayLogs: DayLog[]; settings: Settings },
): Promise<void> {
  await db.transaction('rw', db.periods, db.dayLogs, db.settings, async () => {
    await Promise.all([db.periods.clear(), db.dayLogs.clear(), db.settings.clear()]);
    await db.periods.bulkPut(data.periods);
    await db.dayLogs.bulkPut(data.dayLogs);
    await db.settings.put({ key: 'app', ...data.settings });
  });
}
