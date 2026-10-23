import type { DayLog } from './types';

const lower = (s: string) => s.toLocaleLowerCase('ru');

/**
 * Одно название для призрачной подсказки: совпадение по началу, без учёта
 * регистра, первое в списке (последнее использованное). null — пустой ввод,
 * нет совпадения или ввод уже полностью совпал.
 */
export function suggestMedName(input: string, known: string[]): string | null {
  const q = lower(input.trim());
  if (!q) return null;
  const hit = known.find((n) => lower(n).startsWith(q));
  return hit && lower(hit) !== q ? hit : null;
}

/** Название — в начало списка; уже известное переносится без дубля, в новом написании */
export const rememberMedName = (name: string, known: string[]): string[] => [
  name,
  ...known.filter((n) => lower(n) !== lower(name)),
];

/** Убирает названия, которых нет ни в одной записи дневника (например, исправленную опечатку) */
export function pruneMedNames(known: string[], logs: DayLog[]): string[] {
  const used = new Set(logs.flatMap((l) => l.meds ?? []).map((m) => lower(m.name)));
  return known.filter((n) => used.has(lower(n)));
}

/** «400 мг · 09:30» */
export const medDetails = (m: { dose?: string; time?: string }) =>
  [m.dose, m.time].filter(Boolean).join(' · ');
