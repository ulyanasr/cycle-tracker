// Дневник дня (5.3): выезжающая снизу панель. Всё применяется по «Сохранить»,
// ✕ и тап по затемнению закрывают без сохранения.
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { useDayLog, usePeriods, useSettings } from '../db/hooks';
import { saveDayLog, updatePeriods } from '../db/repo';
import { useToday } from '../hooks/useToday';
import { cycleDay, isPeriodDay, phaseOn } from '../logic/cycle';
import { toDate, type DateStr } from '../logic/dates';
import { capitalize } from '../logic/months';
import { toggleDay } from '../logic/periods';
import { PHASE_NAME } from '../logic/phaseTexts';
import { FLOW_LABEL, FLOWS, MOODS } from '../logic/scales';
import type { DayLog, Flow, Period } from '../logic/types';
import { Chips, draftToMed, MedsField, ScaleField, Toggle, type MedDraft } from './diary/fields';
import { CloseIcon } from './Icons';
import './Overlays.css';
import './DiarySheet.css';

type Props = { date: DateStr | null; onClose: () => void };

export function DiarySheet({ date, onClose }: Props) {
  const open = date !== null;

  // Пока панель открыта, страница под ней не прокручивается
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className={`overlay ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="backdrop" onClick={onClose} />
      <section className="sheet diary" role="dialog" aria-modal="true" aria-label="Дневник дня">
        <div className="sheet-handle" />
        {/* key: при смене дня форма собирается заново из сохранённых данных */}
        {date && <DiaryLoader key={date} date={date} onClose={onClose} />}
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
  const [medDraft, setMedDraft] = useState<MedDraft>(null);
  // Блоки «+ Добавить»: открыты, если уже заполнены
  const [extras, setExtras] = useState<Set<Extra>>(
    () => new Set((['pms', 'wellbeing', 'note'] as Extra[]).filter((k) => saved?.[k] !== undefined)),
  );

  const patch = (p: Partial<DayLog>) => setLog((l) => ({ ...l, ...p }));
  const openExtra = (k: Extra) => setExtras((s) => new Set(s).add(k));

  const day = cycleDay(periods, date);
  const phase = phaseOn(periods, date, today);
  const subtitle = [day && `${day}-й день`, phase && PHASE_NAME[phase]].filter(Boolean).join(' · ');

  const save = async () => {
    const pending = draftToMed(medDraft);
    const meds = [...(log.meds ?? []), ...(pending ? [pending] : [])];
    // Интенсивность имеет смысл только в дни месячных
    await saveDayLog(db, { ...log, meds, flow: isPeriod ? log.flow : undefined });
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
          draft={medDraft}
          onDraft={setMedDraft}
          onChange={(meds) => patch({ meds })}
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
