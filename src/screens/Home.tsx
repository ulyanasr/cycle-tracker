import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { BackIcon, ForwardIcon, MenuIcon } from '../components/Icons';
import { MonthCalendar } from '../components/MonthCalendar';
import { db } from '../db/db';
import { exportBackup, useBackupData } from '../db/backupIO';
import { updatePeriods } from '../db/repo';
import { useToday } from '../hooks/useToday';
import { backupBanner } from '../logic/backup';
import { dayKind, type DayKind } from '../logic/cycle';
import { toDate, type DateStr } from '../logic/dates';
import { homeSummary } from '../logic/home';
import { capitalize, monthCells, monthName, monthOf, shiftMonth } from '../logic/months';
import { finishPeriod, startPeriod, toggleDay } from '../logic/periods';
import { plural } from '../logic/plural';
import './Home.css';

type Props = {
  onMenu: () => void;
  /** Тап по дню в обычном режиме — дневник этого дня */
  onOpenDay: (date: DateStr) => void;
};

const NO_PERIODS: never[] = [];

// «Ср, 14 октября»: date-fns даёт «ср», первую букву делаем заглавной
const dateLabel = (date: DateStr) => capitalize(format(toDate(date), 'EEEEEE, d MMMM', { locale: ru }));

export function Home({ onMenu, onOpenDay }: Props) {
  const today = useToday();
  // Все данные сразу: экспорт из баннера должен стартовать без чтения базы
  const data = useBackupData();
  const periods = data?.periods ?? NO_PERIODS;
  const banner = data
    ? backupBanner(today, data.settings.lastExportAt, data.periods.length + data.dayLogs.length > 0)
    : null;
  const [month, setMonth] = useState(() => monthOf(today));
  const [editing, setEditing] = useState(false);

  const summary = useMemo(() => homeSummary(periods, today), [periods, today]);
  const { label, value } = summary.card;

  const kinds = useMemo(() => {
    const m = new Map<DateStr, DayKind>();
    for (const d of monthCells(month)) {
      if (!d) continue;
      const k = dayKind(periods, d, today, summary.forecast);
      // В режиме «Изменить» прогноз не рисуется, чтобы его пунктир не путался с пунктиром для отметки
      m.set(d, editing && (k === 'forecast' || k === 'possible') ? null : k);
    }
    return m;
  }, [month, periods, today, summary.forecast, editing]);
  const hasPossible = [...kinds.values()].includes('possible');

  const onTapDay = (date: DateStr) => {
    if (editing) updatePeriods(db, (ps) => toggleDay(ps, date, today));
    else onOpenDay(date);
  };

  return (
    <main className="screen home">
      <div className="top-bar">
        <button className="round-btn" aria-label="Открыть меню" onClick={onMenu}>
          <MenuIcon />
        </button>
        <span className="pill">{dateLabel(today)}</span>
      </div>

      <div>
        {summary.title ? (
          <>
            <h1 className="screen-title">{summary.title}</h1>
            <p className="home-sub">{summary.cycleDay}-й день цикла</p>
          </>
        ) : (
          <>
            <h1 className="screen-title">Отметь месячные</h1>
            <p className="home-sub">Нажми «Изменить» у календаря или «Начались сегодня» — и появится прогноз.</p>
          </>
        )}
      </div>

      <section className="home-cards">
        <div className="card-indigo">
          <div className="card-indigo-row">
            <div>
              <p className="card-indigo-label">{label}</p>
              <p className="card-indigo-value">{value}</p>
            </div>
            <div className="avg-square">
              <span>Средний цикл</span>
              <b>{summary.avgCycle}</b>
              <span>{plural(summary.avgCycle, 'день', 'дня', 'дней')}</span>
            </div>
          </div>
          {summary.button && (
            <button
              className="period-btn"
              onClick={() => updatePeriods(db, (ps) => (summary.button === 'start' ? startPeriod : finishPeriod)(ps, today))}
            >
              <i className={summary.button === 'finish' ? 'is-lavender' : ''} aria-hidden="true" />
              {summary.button === 'start' ? 'Начались сегодня' : 'Закончились сегодня'}
            </button>
          )}
        </div>

        {summary.body && summary.sport && (
          <div className="phase-cards">
            <div className="card-teal">
              <h2>Тело сейчас</h2>
              <p>{summary.body}</p>
            </div>
            <div className="card-lime">
              <h2>Спорт сегодня</h2>
              <p>Бег — {summary.sport.run}</p>
              <p>Силовые — {summary.sport.strength}</p>
              <p>Йога — {summary.sport.yoga}</p>
            </div>
          </div>
        )}
      </section>

      <div>
        {banner && (
          <button
            className="backup-banner"
            onClick={() => data && exportBackup(data)}
          >
            {banner} <span aria-hidden="true">→</span>
          </button>
        )}
        <MonthCalendar
          month={month}
          today={today}
          editing={editing}
          pressable={editing}
          kindOf={(d) => kinds.get(d) ?? null}
          onTap={onTapDay}
          header={
            <>
              <div className="cal-head">
                <h2>{capitalize(monthName(month.month))} {month.year}</h2>
                {editing ? (
                  <button className="pill-btn is-black" onClick={() => setEditing(false)}>Готово</button>
                ) : (
                  <div className="cal-head-actions">
                    <button className="pill-btn" onClick={() => setEditing(true)}>Изменить</button>
                    <button className="round-btn" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
                      <BackIcon size={20} />
                    </button>
                    <button className="round-btn" aria-label="Следующий месяц" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
                      <ForwardIcon size={20} />
                    </button>
                  </div>
                )}
              </div>
              {editing && (
                <p className="edit-hint" role="status">
                  Тапай по дням, чтобы отметить или снять месячные. Конец и прогноз пересчитаются сами.
                </p>
              )}
            </>
          }
        />
        <ul className="legend" aria-label="Обозначения">
          <li><i className="dot-period" />Месячные</li>
          <li><i className="dot-forecast" />Прогноз</li>
          {hasPossible && <li><i className="dot-possible" />Возможно</li>}
          <li><i className="dot-fertile" />Фертильное окно</li>
          <li><i className="dot-ovulation" />Овуляция</li>
        </ul>
      </div>
    </main>
  );
}
