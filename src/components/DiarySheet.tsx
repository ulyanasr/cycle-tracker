// Дневник дня (5.3): выезжающая снизу панель. Всё применяется по «Сохранить»,
// ✕ и тап по затемнению закрывают без сохранения.
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { db } from '../db/db';
import { useDayLog, usePeriods, useSettings } from '../db/hooks';
import { addKnownMedName, saveDayLog, updatePeriods } from '../db/repo';
import { useToday } from '../hooks/useToday';
import { cycleDay, isPeriodDay, phaseOn } from '../logic/cycle';
import { toDate, type DateStr } from '../logic/dates';
import { capitalize } from '../logic/months';
import { toggleDay } from '../logic/periods';
import { PHASE_TITLE } from '../logic/phaseTexts';
import { FLOW_LABEL, FLOWS, MOODS } from '../logic/scales';
import type { DayLog, Flow, Period } from '../logic/types';
import { Chips, MedsField, ScaleField, Toggle } from './diary/fields';
import { CloseIcon } from './Icons';
import './Overlays.css';
import './DiarySheet.css';

type Props = { date: DateStr | null; onClose: () => void };

export function DiarySheet({ date, onClose }: Props) {
  const open = date !== null;
  // Пока панель уезжает вниз, показываем последний открытый день, а не пустоту.
  // n — номер открытия: каждое открытие собирает форму заново, без отменённых правок
  const [shown, setShown] = useState({ date, open, n: 0 });
  if (open !== shown.open || (open && date !== shown.date)) {
    setShown({ date: open ? date : shown.date, open, n: open && !shown.open ? shown.n + 1 : shown.n });
  }

  // Пока панель открыта, страница под ней не прокручивается
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Свайп вниз за «ручку» или заголовок закрывает без сохранения
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.sheet-handle, .diary-head') || target.closest('button')) return;
    drag.current = { y: e.clientY, t: e.timeStamp };
    e.currentTarget.setPointerCapture(e.pointerId);
    sheet.current!.style.transition = 'none';
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current) return;
    sheet.current!.style.transform = `translateY(${Math.max(0, e.clientY - drag.current.y)}px)`;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    const speed = dy / Math.max(1, e.timeStamp - drag.current.t);
    drag.current = null;
    // Сбрасываем инлайн-стили: панель доедет вниз или вернётся с обычной анимацией
    sheet.current!.style.transition = '';
    sheet.current!.style.transform = '';
    if (dy > 120 || speed > 0.6) onClose();
  };

  return (
    <div className={`overlay ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="backdrop" onClick={onClose} />
      <section
        ref={sheet}
        className="sheet diary"
        role="dialog"
        aria-modal="true"
        aria-label="Дневник дня"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="sheet-handle" />
        {shown.date && <DiaryLoader key={`${shown.date}-${shown.n}`} date={shown.date} onClose={onClose} />}
      </section>
    </div>
  );
}

function DiaryLoader({ date, onClose }: { date: DateStr; onClose: () => void }) {
  const log = useDayLog(date);
  const periods = usePeriods();
  const settings = useSettings();
  if (log === undefined || !periods || !settings) return null;
  return <DiaryForm date={date} saved={log} periods={periods} knownMeds={settings.knownMedNames} onClose={onClose} />;
}

type Extra = 'pms' | 'wellbeing' | 'note';

function DiaryForm({
  date,
  saved,
  periods,
  knownMeds,
  onClose,
}: {
  date: DateStr;
  saved: DayLog | null;
  periods: Period[];
  knownMeds: string[];
  onClose: () => void;
}) {
  const today = useToday();
  const wasPeriod = isPeriodDay(periods, date, today);
  const [isPeriod, setIsPeriod] = useState(wasPeriod);
  const [log, setLog] = useState<DayLog>(saved ?? { date });
  // Блоки «+ Добавить»: открыты, если уже заполнены
  const [extras, setExtras] = useState<Set<Extra>>(
    () => new Set((['pms', 'wellbeing', 'note'] as Extra[]).filter((k) => saved?.[k] !== undefined)),
  );

  const patch = (p: Partial<DayLog>) => setLog((l) => ({ ...l, ...p }));
  const openExtra = (k: Extra) => setExtras((s) => new Set(s).add(k));

  const day = cycleDay(periods, date);
  const phase = phaseOn(periods, date, today);
  const subtitle = [day && `${day}-й день`, phase && PHASE_TITLE[phase].toLowerCase()].filter(Boolean).join(' · ');

  const save = async () => {
    // Интенсивность имеет смысл только в дни месячных. Незаполненная форма лекарства не сохраняется
    await saveDayLog(db, { ...log, flow: isPeriod ? log.flow : undefined });
    if (isPeriod !== wasPeriod) await updatePeriods(db, (ps) => toggleDay(ps, date, today));
    onClose();
  };

  return (
    <>
      <div className="diary-scroll">
        <div className="diary-head">
          <div>
            <h2>{capitalize(format(toDate(date), 'EEEE, d MMMM', { locale: ru }))}</h2>
            {subtitle && <p className="diary-sub">{subtitle}</p>}
          </div>
          <button className="round-btn" aria-label="Закрыть без сохранения" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="diary-period">
          <Toggle label={date === today ? 'Месячные сегодня' : 'Месячные в этот день'} checked={isPeriod} onChange={setIsPeriod} />
          {isPeriod && (
            <Chips
              options={FLOWS}
              labelOf={(f) => FLOW_LABEL[f as Flow]}
              isOn={(f) => log.flow === f}
              onToggle={(f) => setLog((l) => ({ ...l, flow: l.flow === f ? undefined : (f as Flow) }))}
            />
          )}
        </div>

        <ScaleField kind="pain" value={log.pain} onChange={(pain) => patch({ pain })} />

        <section className="diary-block">
          <h3>Настроение и состояние</h3>
          <Chips
            options={MOODS}
            isOn={(m) => !!log.moods?.includes(m)}
            onToggle={(m) =>
              // От актуального состояния: два быстрых тапа подряд не теряют выбор
              setLog((l) => {
                const cur = l.moods ?? [];
                return { ...l, moods: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] };
              })
            }
          />
        </section>

        <MedsField
          meds={log.meds ?? []}
          known={knownMeds}
          onChange={(meds) => patch({ meds })}
          onRemember={(name) => addKnownMedName(db, name)}
        />

        {extras.has('pms') && <ScaleField kind="pms" value={log.pms} onChange={(pms) => patch({ pms })} />}
        {extras.has('wellbeing') && (
          <ScaleField kind="wellbeing" value={log.wellbeing} onChange={(wellbeing) => patch({ wellbeing })} />
        )}
        {extras.has('note') && (
          <section className="diary-block">
            <h3><label htmlFor="diary-note">Заметка</label></h3>
            <textarea
              id="diary-note"
              className="diary-note"
              rows={3}
              value={log.note ?? ''}
              onChange={(e) => patch({ note: e.target.value })}
            />
          </section>
        )}

        {extras.size < 3 && (
          <section className="diary-block">
            <h3 className="diary-caption-title">Добавить</h3>
            <div className="chips">
              {!extras.has('pms') && <button className="chip is-gray" onClick={() => openExtra('pms')}>+ ПМС</button>}
              {!extras.has('wellbeing') && (
                <button className="chip is-gray" onClick={() => openExtra('wellbeing')}>+ Самочувствие</button>
              )}
              {!extras.has('note') && <button className="chip is-gray" onClick={() => openExtra('note')}>+ Заметка</button>}
            </div>
          </section>
        )}
      </div>

      <div className="diary-footer">
        <button className="btn-black" onClick={save}>Сохранить</button>
      </div>
    </>
  );
}
