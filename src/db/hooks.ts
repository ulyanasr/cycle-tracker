// Живые данные из базы: экраны перерисовываются сразу после любой записи
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { getAllDayLogs, getDayLog, getPeriods, getSettings } from './repo';

/** undefined — пока база ещё читается */
export const usePeriods = () => useLiveQuery(() => getPeriods(db), []);
export const useSettings = () => useLiveQuery(() => getSettings(db), []);
export const useDayLogs = () => useLiveQuery(() => getAllDayLogs(db), []);
export const useDayLog = (date: string) =>
  useLiveQuery(async () => (await getDayLog(db, date)) ?? null, [date]);
