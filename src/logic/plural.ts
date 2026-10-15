/** Склонение: plural(1, 'день', 'дня', 'дней') → 'день' */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const daysLabel = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
