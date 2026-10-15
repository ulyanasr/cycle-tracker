// Бэкап (раздел 3): один JSON-файл. Импорт проверяет файл целиком —
// при любой ошибке ничего не заменяется.
import { toStr, yearOf, type DateStr } from './dates';
import { monthName, monthOf, shiftMonth } from './months';
import { FLOWS } from './scales';
import type { DayLog, Medication, Period, Score, Settings } from './types';

export const BACKUP_VERSION = 1;

export interface Backup {
  version: 1;
  exportedAt: string;
  periods: Period[];
  dayLogs: DayLog[];
  settings: Settings;
}

export const backupFileName = (today: DateStr) => `cycle-backup-${today}.json`;

export function makeBackup(periods: Period[], dayLogs: DayLog[], settings: Settings, now: Date): Backup {
  return { version: BACKUP_VERSION, exportedAt: now.toISOString(), periods, dayLogs, settings };
}

/* ---------------- Проверка файла ---------------- */

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

/** 'YYYY-MM-DD' и такая дата существует (не 2026-02-30) */
export function isValidDate(v: unknown): v is DateStr {
  if (!isStr(v) || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  return toStr(new Date(y, m - 1, d)) === v;
}

const isScore = (v: unknown): v is Score => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;

class BadFile extends Error {}
const fail = (msg: string): never => {
  throw new BadFile(msg);
};

function parsePeriod(v: unknown, i: number): Period {
  if (!isObj(v)) fail(`месячные №${i + 1}: неверный формат`);
  const p = v as Record<string, unknown>;
  if (!isStr(p.id) || !p.id) fail(`месячные №${i + 1}: нет id`);
  if (!isValidDate(p.start)) fail(`месячные №${i + 1}: неверная дата начала`);
  if (p.end !== null && !isValidDate(p.end)) fail(`месячные №${i + 1}: неверная дата конца`);
  if (p.end !== null && (p.end as string) < (p.start as string)) fail(`месячные №${i + 1}: конец раньше начала`);
  return { id: p.id as string, start: p.start as string, end: p.end as string | null };
}

function parseMed(v: unknown, where: string): Medication {
  if (!isObj(v) || !isStr(v.name) || !v.name.trim()) fail(`${where}: у лекарства нет названия`);
  const m = v as Record<string, unknown>;
  const out: Medication = { name: (m.name as string).trim() };
  if (m.dose !== undefined) {
    if (!isStr(m.dose)) fail(`${where}: неверная дозировка`);
    if ((m.dose as string).trim()) out.dose = (m.dose as string).trim();
  }
  if (m.time !== undefined) {
    if (!isStr(m.time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) fail(`${where}: неверное время лекарства`);
    out.time = m.time as string;
  }
  return out;
}

function parseDayLog(v: unknown, i: number): DayLog {
  if (!isObj(v) || !isValidDate(v.date)) fail(`запись дневника №${i + 1}: неверная дата`);
  const l = v as Record<string, unknown>;
  const where = `дневник ${l.date}`;
  const out: DayLog = { date: l.date as string };
  if (l.flow !== undefined) {
    if (!FLOWS.includes(l.flow as never)) fail(`${where}: неверная интенсивность`);
    out.flow = l.flow as DayLog['flow'];
  }
  for (const k of ['pain', 'pms', 'wellbeing'] as const) {
    if (l[k] !== undefined) {
      if (!isScore(l[k])) fail(`${where}: балл должен быть от 1 до 5`);
      out[k] = l[k] as Score;
    }
  }
  if (l.moods !== undefined) {
    if (!Array.isArray(l.moods) || !l.moods.every(isStr)) fail(`${where}: неверный список настроений`);
    if ((l.moods as string[]).length) out.moods = l.moods as string[];
  }
  if (l.meds !== undefined) {
    if (!Array.isArray(l.meds)) fail(`${where}: неверный список лекарств`);
    const meds = (l.meds as unknown[]).map((m) => parseMed(m, where));
    if (meds.length) out.meds = meds;
  }
  if (l.note !== undefined) {
    if (!isStr(l.note)) fail(`${where}: неверная заметка`);
    if ((l.note as string).trim()) out.note = (l.note as string).trim();
  }
  return out;
}

function parseSettings(v: unknown): Settings {
  if (!isObj(v)) fail('нет настроек');
  const s = v as Record<string, unknown>;
  const lastExportAt = s.lastExportAt;
  if (lastExportAt !== null && (!isStr(lastExportAt) || Number.isNaN(Date.parse(lastExportAt)))) {
    fail('неверная дата последнего бэкапа');
  }
  if (!Array.isArray(s.knownMedNames) || !s.knownMedNames.every(isStr)) fail('неверный список лекарств для подсказок');
  // После восстановления первый запуск не нужен
  return { onboardingDone: true, lastExportAt: lastExportAt as string | null, knownMedNames: s.knownMedNames as string[] };
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Это не файл бэкапа: не удалось прочитать JSON.' };
  }
  try {
    if (!isObj(raw)) fail('неверный формат');
    const r = raw as Record<string, unknown>;
    if (r.version !== BACKUP_VERSION) fail(`неизвестная версия файла (${String(r.version)})`);
    if (!Array.isArray(r.periods)) fail('нет списка месячных');
    if (!Array.isArray(r.dayLogs)) fail('нет записей дневника');

    const periods = (r.periods as unknown[]).map(parsePeriod).sort((a, b) => (a.start < b.start ? -1 : 1));
    if (new Set(periods.map((p) => p.id)).size !== periods.length) fail('повторяются id месячных');
    periods.forEach((p, i) => {
      const next = periods[i + 1];
      if (!next) return;
      if (p.end === null) fail(`месячные с ${p.start} не закончены, но после них есть другие`);
      if ((p.end as string) >= next.start) fail(`месячные ${p.start} и ${next.start} пересекаются`);
    });

    const dayLogs = (r.dayLogs as unknown[]).map(parseDayLog);
    if (new Set(dayLogs.map((l) => l.date)).size !== dayLogs.length) fail('повторяются даты в дневнике');

    const settings = parseSettings(r.settings);
    const exportedAt = isStr(r.exportedAt) && !Number.isNaN(Date.parse(r.exportedAt)) ? r.exportedAt : '';
    // Сам файл — бэкап, сделанный в exportedAt: «последний бэкап» не раньше него
    if (exportedAt && (!settings.lastExportAt || Date.parse(exportedAt) > Date.parse(settings.lastExportAt))) {
      settings.lastExportAt = exportedAt;
    }
    return { ok: true, backup: { version: BACKUP_VERSION, exportedAt, periods, dayLogs, settings } };
  } catch (e) {
    if (e instanceof BadFile) return { ok: false, error: `Файл повреждён: ${e.message}.` };
    throw e;
  }
}

/* ---------------- Баннер бэкапа ---------------- */

/**
 * С 1-го числа каждого месяца, пока в этом месяце не было экспорта:
 * «Сохрани бэкап за [прошлый месяц] →». 1–7 января — «Сохрани архив за [год]».
 */
export function backupBanner(today: DateStr, lastExportAt: string | null, hasData: boolean): string | null {
  if (!hasData) return null;
  const monthStart = today.slice(0, 8) + '01';
  if (lastExportAt && toStr(new Date(lastExportAt)) >= monthStart) return null;

  const { month } = monthOf(today);
  const day = Number(today.slice(8));
  if (month === 0 && day <= 7) return `Сохрани архив за ${yearOf(today) - 1}`;
  return `Сохрани бэкап за ${monthName(shiftMonth(monthOf(today), -1).month)}`;
}
