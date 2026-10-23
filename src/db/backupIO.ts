import { db } from './db';
import { useDayLogs, usePeriods, useSettings } from './hooks';
import { replaceAll, updateSettings } from './repo';
import { backupFileName, makeBackup, parseBackup } from '../logic/backup';
import { todayStr } from '../logic/dates';
import type { DayLog, Period, Settings } from '../logic/types';

export type BackupData = { periods: Period[]; dayLogs: DayLog[]; settings: Settings };

/**
 * Данные для экспорта держим наготове заранее. Safari открывает меню
 * «Поделиться» только сразу после нажатия — если сначала читать базу,
 * он может решить, что нажатия не было.
 */
export function useBackupData(): BackupData | null {
  const periods = usePeriods();
  const dayLogs = useDayLogs();
  const settings = useSettings();
  return periods && dayLogs && settings ? { periods, dayLogs, settings } : null;
}

/**
 * Через Web Share API с файлом: на iPhone откроется «Поделиться» →
 * «Сохранить в Файлы» / iCloud Drive / AirDrop. Без него — скачивание.
 * «Последний бэкап» обновляется, только если файл действительно отдан.
 */
export async function exportBackup(data: BackupData): Promise<void> {
  const now = new Date();
  const name = backupFileName(todayStr());
  const json = JSON.stringify(makeBackup(data.periods, data.dayLogs, data.settings, now), null, 2);
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name });
    else download(file);
  } catch (e) {
    // Закрыла «Поделиться» — это не ошибка и не бэкап
    if (!(e instanceof DOMException && e.name === 'AbortError')) alert('Не получилось сохранить файл. Попробуй ещё раз.');
    return;
  }
  await updateSettings(db, { lastExportAt: now.toISOString() });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** true — данные заменены */
export async function importBackup(file: File): Promise<boolean> {
  const parsed = parseBackup(await file.text());
  if (!parsed.ok) {
    alert(parsed.error);
    return false;
  }
  if (!confirm('Заменить текущие данные данными из файла?')) return false;
  await replaceAll(db, parsed.backup);
  return true;
}
