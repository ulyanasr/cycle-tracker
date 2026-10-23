// Локальная база в IndexedDB через Dexie. Данные живут только на устройстве.
import Dexie, { type EntityTable } from 'dexie';
import type { DayLog, Period, Settings } from '../logic/types';

/** Настройки — одна запись с ключом 'app' */
type SettingsRow = Settings & { key: 'app' };

export class CycleDB extends Dexie {
  periods!: EntityTable<Period, 'id'>;
  dayLogs!: EntityTable<DayLog, 'date'>;
  settings!: EntityTable<SettingsRow, 'key'>;

  constructor(name = 'cycle-tracker') {
    super(name);
    // Перечислены только индексы; остальные поля хранятся как есть.
    // Меняешь схему — добавляй version(2), а не правь эту строку.
    this.version(1).stores({
      periods: 'id, start',
      dayLogs: 'date',
      settings: 'key',
    });
  }
}

export const db = new CycleDB();

/**
 * Просим браузер не удалять данные при нехватке места.
 * На iOS даёт эффект для приложения, установленного на экран «Домой».
 */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}
