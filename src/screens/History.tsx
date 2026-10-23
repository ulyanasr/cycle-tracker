// «История циклов» (5.6): текущий год или архив прошлых лет
import { useMemo, useState } from 'react';
import { BackIcon } from '../components/Icons';
import { usePeriods } from '../db/hooks';
import { useToday } from '../hooks/useToday';
import { yearStats } from '../logic/cycle';
import { yearOf } from '../logic/dates';
import { archiveYears, barParts, yearCycles, type HistoryCycle } from '../logic/history';
import { shortDate } from '../logic/notes';
import { daysLabel, plural } from '../logic/plural';
import './History.css';

type View = { kind: 'year'; year: number } | { kind: 'archive' };

/** «31 авг» — без дня недели */
const dayMonth = (d: string) => shortDate(d).split(',')[0];

function CycleCard({ c }: { c: HistoryCycle }) {
  const bar = barParts(c);
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
  const marks = c.strayMarks.map(dayMonth).join(', ');
  return (
    <li className="cycle-card">
      <div className="cycle-head">
        <b>{dayMonth(c.start)} — {c.end ? dayMonth(c.end) : 'сейчас'}</b>
        <span>
          {c.atypical && <em className="atypical-pill">нетипичный</em>}
          {c.current ? `идёт ${c.days}-й день` : daysLabel(c.days)}
        </span>
      </div>
      <div className={`cycle-bar ${c.atypical ? 'is-faded' : ''}`} aria-hidden="true">
        <i className="is-period" style={{ width: pct(bar.period) }} />
        <i className="is-rest" style={{ width: pct(bar.rest) }} />
      </div>
      <p className="cycle-sub">Месячные {daysLabel(c.periodDays)}</p>
      {c.atypical && <p className="cycle-note">Не учитывается в прогнозе. Проверь отметки в календаре.</p>}
      {c.strayMarks.length === 1 && <p className="cycle-note">Отметка {marks} не учитывается. Проверь её в календаре.</p>}
      {c.strayMarks.length > 1 && <p className="cycle-note">Отметки {marks} не учитываются. Проверь их в календаре.</p>}
    </li>
  );
}

export function History({ onBack }: { onBack: () => void }) {
  const today = useToday();
  const periods = usePeriods() ?? [];
  const currentYear = yearOf(today);
  const [view, setView] = useState<View>({ kind: 'year', year: currentYear });

  const years = useMemo(() => archiveYears(periods, today), [periods, today]);
  const year = view.kind === 'year' ? view.year : null;
  const cycles = useMemo(() => (year ? yearCycles(periods, year, today) : []), [periods, year, today]);
  const stats = year ? yearStats(periods, year) : null;
  const isPast = year !== null && year !== currentYear;

  // «Назад» из прошлого года ведёт в список архива
  const back = () => (isPast ? setView({ kind: 'archive' }) : onBack());

  return (
    <main className="screen">
      <div className="top-bar">
        <button className="round-btn" aria-label="Назад" onClick={back}>
          <BackIcon />
        </button>
        <div className="year-switch" role="group" aria-label="Год">
          <button
            className={view.kind === 'year' && !isPast ? 'is-on' : ''}
            aria-pressed={view.kind === 'year' && !isPast}
            onClick={() => setView({ kind: 'year', year: currentYear })}
          >
            {currentYear}
          </button>
          <button
            className={view.kind === 'archive' || isPast ? 'is-on' : ''}
            aria-pressed={view.kind === 'archive' || isPast}
            onClick={() => setView({ kind: 'archive' })}
          >
            Архив
          </button>
        </div>
      </div>

      <h1 className="screen-title is-compact">История циклов</h1>

      {view.kind === 'archive' ? (
        <section className="history-section">
          <h2 className="section-caption">Прошлые годы</h2>
          {years.length === 0 ? (
            <p className="history-empty">Здесь появятся прошлые годы. Данные не удаляются.</p>
          ) : (
            <ul className="archive-list">
              {years.map((y) => {
                const n = yearCycles(periods, y, today).filter((c) => !c.atypical).length;
                return (
                  <li key={y}>
                    <button className="archive-item" onClick={() => setView({ kind: 'year', year: y })}>
                      <b>{y}</b>
                      <span>{n} {plural(n, 'цикл', 'цикла', 'циклов')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <>
          {stats && (
            <div className="history-stats">
              <div className="h-stat is-indigo">
                <span>Цикл</span>
                <b>{stats.avgCycle ?? '—'}</b>
                <small>{plural(stats.avgCycle ?? 0, 'день', 'дня', 'дней')} в среднем</small>
              </div>
              <div className="h-stat is-coral">
                <span>Месячные</span>
                <b>{stats.avgPeriod ?? '—'}</b>
                <small>{plural(stats.avgPeriod ?? 0, 'день', 'дня', 'дней')} в среднем</small>
              </div>
              <div className="h-stat is-teal">
                <span>Разброс</span>
                <b>{stats.spread === null ? '—' : `±${stats.spread}`}</b>
                <small>{plural(stats.spread ?? 0, 'день', 'дня', 'дней')}</small>
              </div>
            </div>
          )}
          <section className="history-section">
            {isPast && <h2 className="section-caption">Циклы {year}</h2>}
            {cycles.length === 0 ? (
              <p className="history-empty">В этом году отметок пока нет.</p>
            ) : (
              <ul className="cycle-list">
                {cycles.map((c) => <CycleCard key={c.start} c={c} />)}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
