// Бэкап (раздел 3). Импорт проверяет файл целиком: при любой ошибке ничего не заменяется
import { byStart } from './cycle';
import { toStr, yearOf, type DateStr } from './dates';
import { monthName, monthOf, shiftMonth } from './months';
import { FLOWS } from './scales';
import type { DayLog, Flow, Medication, Period, Score, Settings } from './types';

export const BACKUP_VERSION = 1;

export interface Backup {
  version: 1;
  exportedAt: string;
  periods: Period[];
  dayLogs: DayLog[];
  settings: Settings;
}

export const backupFileName = (today: DateStr) => `cycle-backup-${today}.json`;

export const makeBackup = (periods: Period[], dayLogs: DayLog[], settings: Settings, now: Date): Backup => ({
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  periods,
  dayLogs,
  settings,
});

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

class BadFile extends Error {}

function check(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new BadFile(msg);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isScore = (v: unknown): v is Score => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
const isFlow = (v: unknown): v is Flow => FLOWS.includes(v as Flow);
const isTime = (v: unknown): v is string => isStr(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isDateTime = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));

/** 'YYYY-MM-DD', и такая дата существует (не 30 февраля) */
export function isValidDate(v: unknown): v is DateStr {
  if (!isStr(v) || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  return toStr(new Date(y, m - 1, d)) === v;
}

/** Убирает пустые поля: undefined, пустые строки и массивы */
const compact = <T extends object>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
  ) as T;

function parsePeriod(v: unknown, i: number): Period {
  const at = `месячные №${i + 1}`;
  check(isObj(v), `${at}: неверный формат`);
  const { id, start, end } = v;
  check(isStr(id) && id, `${at}: нет id`);
  check(isValidDate(start), `${at}: неверная дата начала`);
  check(end === null || isValidDate(end), `${at}: неверная дата конца`);
  check(end === null || end >= start, `${at}: конец раньше начала`);
  return { id, start, end };
}

function parseMed(v: unknown, at: string): Medication {
  check(isObj(v), `${at}: неверный формат лекарства`);
  const { name, dose, time } = v;
  check(isStr(name) && name.trim(), `${at}: у лекарства нет названия`);
  check(dose === undefined || isStr(dose), `${at}: неверная дозировка`);
  check(time === undefined || isTime(time), `${at}: неверное время лекарства`);
  return compact({ name: name.trim(), dose: dose?.trim(), time });
}

function parseScore(v: unknown, at: string) {
  check(v === undefined || isScore(v), `${at}: балл должен быть от 1 до 5`);
  return v;
}

function parseDayLog(v: unknown, i: number): DayLog {
  check(isObj(v), `запись дневника №${i + 1}: неверный формат`);
  const { date, flow, pain, pms, wellbeing, moods, meds, note } = v;
  check(isValidDate(date), `запись дневника №${i + 1}: неверная дата`);
  const at = `дневник ${date}`;
  check(flow === undefined || isFlow(flow), `${at}: неверная интенсивность`);
  check(moods === undefined || (Array.isArray(moods) && moods.every(isStr)), `${at}: неверный список настроений`);
  check(meds === undefined || Array.isArray(meds), `${at}: неверный список лекарств`);
  check(note === undefined || isStr(note), `${at}: неверная заметка`);
  return compact({
    date,
    flow,
    pain: parseScore(pain, at),
    pms: parseScore(pms, at),
    wellbeing: parseScore(wellbeing, at),
    moods,
    meds: meds?.map((m) => parseMed(m, at)),
    note: note?.trim(),
  });
}

function parseSettings(v: unknown): Settings {
  check(isObj(v), 'нет настроек');
  const { lastExportAt, knownMedNames } = v;
  check(lastExportAt === null || isDateTime(lastExportAt), 'неверная дата последнего бэкапа');
  check(Array.isArray(knownMedNames) && knownMedNames.every(isStr), 'неверный список лекарств для подсказок');
  // После восстановления первый запуск не нужен
  return { onboardingDone: true, lastExportAt, knownMedNames };
}

function parseFile(raw: unknown): Backup {
  check(isObj(raw), 'неверный формат');
  check(raw.version === BACKUP_VERSION, `неизвестная версия файла (${String(raw.version)})`);
  check(Array.isArray(raw.periods), 'нет списка месячных');
  check(Array.isArray(raw.dayLogs), 'нет записей дневника');

  const periods = raw.periods.map(parsePeriod).sort(byStart);
  check(new Set(periods.map((p) => p.id)).size === periods.length, 'повторяются id месячных');
  periods.slice(1).forEach((next, i) => {
    const p = periods[i];
    check(p.end !== null, `месячные с ${p.start} не закончены, но после них есть другие`);
    check(p.end < next.start, `месячные ${p.start} и ${next.start} пересекаются`);
  });

  const dayLogs = raw.dayLogs.map(parseDayLog);
  check(new Set(dayLogs.map((l) => l.date)).size === dayLogs.length, 'повторяются даты в дневнике');

  // Сам файл — бэкап, сделанный в exportedAt: «последний бэкап» не может быть раньше
  const settings = parseSettings(raw.settings);
  const exportedAt = isDateTime(raw.exportedAt) ? raw.exportedAt : '';
  if (exportedAt && (!settings.lastExportAt || Date.parse(exportedAt) > Date.parse(settings.lastExportAt))) {
    settings.lastExportAt = exportedAt;
  }
  return { version: BACKUP_VERSION, exportedAt, periods, dayLogs, settings };
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Это не файл бэкапа: не удалось прочитать JSON.' };
  }
  try {
    return { ok: true, backup: parseFile(raw) };
  } catch (e) {
    if (e instanceof BadFile) return { ok: false, error: `Файл повреждён: ${e.message}.` };
    throw e;
  }
}

/** С 1-го числа, пока в этом месяце не было экспорта; 1–7 января — архив за прошлый год */
export function backupBanner(today: DateStr, lastExportAt: string | null, hasData: boolean): string | null {
  if (!hasData) return null;
  if (lastExportAt && toStr(new Date(lastExportAt)) >= today.slice(0, 8) + '01') return null;

  const current = monthOf(today);
  if (current.month === 0 && Number(today.slice(8)) <= 7) return `Сохрани архив за ${yearOf(today) - 1}`;
  return `Сохрани бэкап за ${monthName(shiftMonth(current, -1).month)}`;
}
