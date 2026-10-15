// Чтение и запись данных. Экраны работают только через эти функции,
// напрямую в таблицы не ходят.
import type { CycleDB } from './db';
import type { DayLog, Period, Settings } from '../logic/types';

export const DEFAULT_SETTINGS: Settings = {
  onboardingDone: false,
  lastExportAt: null,
  knownMedNames: [],
};

/* ---------------- Месячные ---------------- */

export const getPeriods = (db: CycleDB): Promise<Period[]> => db.periods.orderBy('start').toArray();

/**
 * Логика тапов (logic/periods.ts) возвращает новый список целиком:
 * месячные могут склеиться или разделиться. Поэтому заменяем весь
 * список одной транзакцией — либо сохранится всё, либо ничего.
 */
export async function savePeriods(db: CycleDB, periods: Period[]): Promise<void> {
  await db.transaction('rw', db.periods, async () => {
    await db.periods.clear();
    await db.periods.bulkPut(periods);
  });
}

/**
 * Правка месячных: читает актуальный список и записывает результат
 * в одной транзакции. Так два быстрых тапа подряд не затрут друг друга.
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

/* ---------------- Дневник дня ---------------- */

export const getDayLog = (db: CycleDB, date: string): Promise<DayLog | undefined> =>
  db.dayLogs.get(date);

export const getAllDayLogs = (db: CycleDB): Promise<DayLog[]> => db.dayLogs.toArray();

/** Убирает пустые поля: пустая заметка, пустой список настроений и т.п. */
export function normalizeDayLog(log: DayLog): DayLog {
  const out: DayLog = { date: log.date };
  if (log.flow) out.flow = log.flow;
  if (log.pain) out.pain = log.pain;
  if (log.pms) out.pms = log.pms;
  if (log.wellbeing) out.wellbeing = log.wellbeing;
  if (log.moods?.length) out.moods = [...log.moods];

  const meds = (log.meds ?? [])
    .map((m) => ({
      name: m.name.trim(),
      ...(m.dose?.trim() ? { dose: m.dose.trim() } : {}),
      ...(m.time ? { time: m.time } : {}),
    }))
    .filter((m) => m.name);
  if (meds.length) out.meds = meds;

  const note = log.note?.trim();
  if (note) out.note = note;
  return out;
}

export const isEmptyDayLog = (log: DayLog) => Object.keys(normalizeDayLog(log)).length === 1;

/**
 * Сохраняет дневник дня. Пустой дневник удаляется, чтобы в «Заметках»
 * не появлялись пустые карточки. Названия лекарств запоминаются для подсказок.
 */
export async function saveDayLog(db: CycleDB, log: DayLog): Promise<void> {
  const clean = normalizeDayLog(log);
  await db.transaction('rw', db.dayLogs, db.settings, async () => {
    if (isEmptyDayLog(clean)) await db.dayLogs.delete(clean.date);
    else await db.dayLogs.put(clean);
    if (clean.meds) await rememberMedNames(db, clean.meds.map((m) => m.name));
  });
}

/* ---------------- Настройки ---------------- */

export async function getSettings(db: CycleDB): Promise<Settings> {
  const row = await db.settings.get('app');
  if (!row) return { ...DEFAULT_SETTINGS };
  const { key: _key, ...rest } = row;
  return { ...DEFAULT_SETTINGS, ...rest };
}

export async function updateSettings(db: CycleDB, patch: Partial<Settings>): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const next = { ...(await getSettings(db)), ...patch };
    await db.settings.put({ key: 'app', ...next });
    return next;
  });
}

/**
 * Добавляет названия в подсказки. Без дублей без учёта регистра
 * («ибупрофен» = «Ибупрофен»); последние использованные — в начале.
 */
export async function rememberMedNames(db: CycleDB, names: string[]): Promise<void> {
  const { knownMedNames } = await getSettings(db);
  const fresh = names.map((n) => n.trim()).filter(Boolean);
  const seen = new Set<string>();
  const merged = fresh.concat(knownMedNames).filter((n) => {
    const k = n.toLocaleLowerCase('ru');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await updateSettings(db, { knownMedNames: merged });
}

/* ---------------- Восстановление из бэкапа ---------------- */

/** Полная замена всех данных одной транзакцией: либо всё, либо ничего */
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
