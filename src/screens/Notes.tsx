import { useMemo, useState } from 'react';
import { MenuIcon } from '../components/Icons';
import { useDayLogs, usePeriods } from '../db/hooks';
import { useToday } from '../hooks/useToday';
import type { DateStr } from '../logic/dates';
import { notesFeed, type NoteRow, type NotesFilter } from '../logic/notes';
import { SCORES } from '../logic/scales';
import type { Score } from '../logic/types';
import './Notes.css';

type Props = {
  onMenu: () => void;
  onOpenDay: (date: DateStr) => void;
};

const FILTERS: { key: NotesFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'pain', label: 'С болью' },
  { key: 'meds', label: 'С лекарствами' },
];

const EMPTY_TEXT: Record<NotesFilter, string> = {
  all: 'Записей пока нет. Нажми «+», чтобы записать самочувствие за сегодня.',
  pain: 'Записей с болью нет.',
  meds: 'Записей с лекарствами нет.',
};

function ScoreBars({ score }: { score: Score }) {
  return (
    <span className="score-bars" aria-hidden="true">
      {SCORES.map((i) => (
        <i key={i} className={i <= score ? 'is-on' : ''} />
      ))}
    </span>
  );
}

function Row({ row }: { row: NoteRow }) {
  return (
    <div className="note-row">
      <dt>{row.label}</dt>
      <dd className={row.kind === 'note' ? 'is-note' : ''}>
        {row.kind === 'score' ? (
          <>
            <ScoreBars score={row.score} />
            <span>{row.score} — {row.text}</span>
          </>
        ) : (
          row.text
        )}
      </dd>
    </div>
  );
}

export function Notes({ onMenu, onOpenDay }: Props) {
  const today = useToday();
  const logs = useDayLogs();
  const periods = usePeriods();
  const [filter, setFilter] = useState<NotesFilter>('all');
  const feed = useMemo(
    () => (logs && periods ? notesFeed(logs, periods, today, filter) : []),
    [logs, periods, today, filter],
  );

  return (
    <main className="screen notes">
      <div className="top-bar">
        <button className="round-btn" aria-label="Открыть меню" onClick={onMenu}>
          <MenuIcon />
        </button>
        <span className="pill">{today.slice(0, 4)}</span>
      </div>
      <h1 className="screen-title">Заметки</h1>

      <section className="notes-filters">
        <p className="notes-caption" id="notes-filter-label">Показать записи</p>
        <div className="filter-pills" role="group" aria-labelledby="notes-filter-label">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'is-on' : ''}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {logs && feed.length === 0 && <p className="notes-empty">{EMPTY_TEXT[filter]}</p>}

      {feed.map((group) => (
        <section key={group.title} className="notes-group">
          <h2 className="notes-caption">{group.title}</h2>
          {group.cards.map((card) => (
            <button key={card.date} className="note-card" onClick={() => onOpenDay(card.date)}>
              <div className="note-head">
                <b>
                  {card.isPeriod && <i className="note-dot" role="img" aria-label="месячные" />}
                  {card.title}
                </b>
                {card.cycleDay && <span>{card.cycleDay}-й день цикла</span>}
              </div>
              <dl>
                {card.rows.map((r) => (
                  <Row key={r.label} row={r} />
                ))}
              </dl>
            </button>
          ))}
        </section>
      ))}
    </main>
  );
}
