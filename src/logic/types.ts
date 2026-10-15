// Модели данных из раздела 3 спецификации
import type { DateStr } from './dates';

export type Flow = 'light' | 'medium' | 'heavy';
export type Score = 1 | 2 | 3 | 4 | 5;

export interface Period {
  id: string;
  start: DateStr;
  end: DateStr | null; // null = идут сейчас
}

export interface Medication {
  name: string;
  dose?: string;
  time?: string; // 'HH:mm'
}

export interface DayLog {
  date: DateStr;
  flow?: Flow;
  pain?: Score;
  pms?: Score;
  wellbeing?: Score;
  moods?: string[];
  meds?: Medication[];
  note?: string;
}

export interface Settings {
  onboardingDone: boolean;
  lastExportAt: string | null;
  knownMedNames: string[];
}
