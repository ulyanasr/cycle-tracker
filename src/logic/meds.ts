const lower = (s: string) => s.toLocaleLowerCase('ru');

/** Сначала названия, начинающиеся с введённого; точное совпадение не подсказываем */
export function suggestMeds(known: string[], query: string, limit = 5): string[] {
  const q = lower(query.trim());
  if (!q) return known.slice(0, limit);
  const hits = known.filter((n) => lower(n) !== q && lower(n).includes(q));
  const starts = (n: string) => lower(n).startsWith(q);
  return [...hits.filter(starts), ...hits.filter((n) => !starts(n))].slice(0, limit);
}

/** «400 мг · 09:30» */
export const medDetails = (m: { dose?: string; time?: string }) =>
  [m.dose, m.time].filter(Boolean).join(' · ');
