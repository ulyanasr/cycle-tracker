/**
 * Подсказки при вводе названия лекарства из ранее введённых.
 * Без учёта регистра; сначала те, что начинаются с введённого, потом
 * содержащие его. Точное совпадение не подсказываем — оно уже введено.
 */
export function suggestMeds(known: string[], query: string, limit = 5): string[] {
  const q = query.trim().toLocaleLowerCase('ru');
  if (!q) return known.slice(0, limit);
  const lower = (s: string) => s.toLocaleLowerCase('ru');
  const starts = known.filter((n) => lower(n).startsWith(q) && lower(n) !== q);
  const contains = known.filter((n) => !lower(n).startsWith(q) && lower(n).includes(q));
  return [...starts, ...contains].slice(0, limit);
}

/** «400 мг · 09:30» — только заполненное */
export const medDetails = (m: { dose?: string; time?: string }) =>
  [m.dose, m.time].filter(Boolean).join(' · ');
