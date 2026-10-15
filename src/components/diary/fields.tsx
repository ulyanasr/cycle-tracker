// Блоки дневника: переключатель, шкала 1–5, чипы, лекарства
import { useId } from 'react';
import { medDetails, suggestMeds } from '../../logic/meds';
import { SCALE_LABELS, SCALE_TITLE, SCORE_COLOR, SCORES, type ScaleKind } from '../../logic/scales';
import type { Medication, Score } from '../../logic/types';
import { CloseIcon } from '../Icons';

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="diary-toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

/** Шкала из 5 кнопок; повторный тап снимает выбор */
export function ScaleField({ kind, value, onChange }: { kind: ScaleKind; value?: Score; onChange: (v?: Score) => void }) {
  const titleId = useId();
  return (
    <section className="diary-block">
      <div className="diary-block-head">
        <h3 id={titleId}>{SCALE_TITLE[kind]}</h3>
        <span className="diary-caption">1–5</span>
      </div>
      <div className="scale" role="group" aria-labelledby={titleId}>
        {SCORES.map((s) => {
          const on = value === s;
          return (
            <button
              key={s}
              type="button"
              className={`scale-btn ${on ? 'is-on' : ''} ${on && s >= 3 ? 'is-dark' : ''}`}
              style={on ? { background: SCORE_COLOR[s] } : undefined}
              aria-pressed={on}
              aria-label={`${s} — ${SCALE_LABELS[kind][s]}`}
              onClick={() => onChange(on ? undefined : s)}
            >
              {s}
            </button>
          );
        })}
      </div>
      {value && <p className="scale-label">{SCALE_LABELS[kind][value]}</p>}
    </section>
  );
}

/** Чипы: множественный или одиночный выбор */
export function Chips({
  options,
  isOn,
  onToggle,
  labelOf = (o) => o,
}: {
  options: string[];
  isOn: (o: string) => boolean;
  onToggle: (o: string) => void;
  labelOf?: (o: string) => string;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} type="button" className={`chip ${isOn(o) ? 'is-on' : ''}`} aria-pressed={isOn(o)} onClick={() => onToggle(o)}>
          {labelOf(o)}
        </button>
      ))}
    </div>
  );
}

export type MedDraft = { name: string; dose: string; time: string } | null;

/** Черновик в лекарство; пустое название — null */
export function draftToMed(d: MedDraft): Medication | null {
  if (!d || !d.name.trim()) return null;
  return { name: d.name.trim(), ...(d.dose.trim() ? { dose: d.dose.trim() } : {}), ...(d.time ? { time: d.time } : {}) };
}

/**
 * Черновик формы хранит родитель: если нажать «Сохранить», не нажав
 * «Добавить», введённое лекарство не потеряется.
 */
export function MedsField({
  meds,
  known,
  draft,
  onDraft,
  onChange,
}: {
  meds: Medication[];
  known: string[];
  draft: MedDraft;
  onDraft: (d: MedDraft) => void;
  onChange: (meds: Medication[]) => void;
}) {
  const hints = draft ? suggestMeds(known, draft.name) : [];
  const set = (patch: Partial<NonNullable<MedDraft>>) => draft && onDraft({ ...draft, ...patch });
  const add = () => {
    const med = draftToMed(draft);
    if (!med) return;
    onChange([...meds, med]);
    onDraft(null);
  };

  return (
    <section className="diary-block">
      <h3>Лекарства</h3>
      {meds.map((m, i) => (
        <div key={i} className="med-card">
          <div>
            <b>{m.name}</b>
            {medDetails(m) && <span>{medDetails(m)}</span>}
          </div>
          <button type="button" className="med-remove" aria-label={`Удалить ${m.name}`} onClick={() => onChange(meds.filter((_, j) => j !== i))}>
            <CloseIcon size={20} />
          </button>
        </div>
      ))}

      {draft ? (
        <div className="med-form">
          <label>
            <span>Название</span>
            <input value={draft.name} onChange={(e) => set({ name: e.target.value })} autoFocus autoComplete="off" />
          </label>
          {hints.length > 0 && (
            <div className="chips">
              {hints.map((h) => (
                <button key={h} type="button" className="chip is-gray" onClick={() => set({ name: h })}>{h}</button>
              ))}
            </div>
          )}
          <div className="med-form-row">
            <label>
              <span>Дозировка</span>
              <input value={draft.dose} onChange={(e) => set({ dose: e.target.value })} placeholder="400 мг" />
            </label>
            <label>
              <span>Время</span>
              <input type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
            </label>
          </div>
          <div className="med-form-actions">
            <button type="button" className="chip is-gray" onClick={() => onDraft(null)}>Отмена</button>
            <button type="button" className="chip is-black" onClick={add} disabled={!draft.name.trim()}>Добавить</button>
          </div>
        </div>
      ) : (
        <button type="button" className="med-add" onClick={() => onDraft({ name: '', dose: '', time: '' })}>+ Лекарство</button>
      )}
    </section>
  );
}
