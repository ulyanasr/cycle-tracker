import { useEffect, useState } from 'react';
import { todayStr } from '../logic/dates';

/**
 * «Сегодня», которое само меняется после полуночи: приложение на iPhone
 * может висеть открытым днями. Проверяем раз в минуту и при возвращении.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday(todayStr());
    const timer = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}
