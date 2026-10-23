import { useId, useRef, useState } from 'react';
import { medDetails, suggestMedName } from '../../logic/meds';
import { SCALE_LABELS, SCALE_TITLE, SCORE_COLOR, SCORES, type ScaleKind } from '../../logic/scales';
import type { Medication, Score } from '../../logic/types';
import { CheckIcon, CloseIcon } from '../Icons';

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

export function Chips<T extends string>({
  options,
  isOn,
  onToggle,
  labelOf = (o) => o,
}: {
  options: readonly T[];
  isOn: (o: T) => boolean;
  onToggle: (o: T) => void;
  labelOf?: (o: T) => string;
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

export function MedsField({
  meds,
  known,
  onChange,
  onRemember,
}: {
  meds: Medication[];
  known: string[];
  onChange: (meds: Medication[]) => void;
  /** «Добавить» сразу сохраняет название в подсказки */
  onRemember: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');
  const doseRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const suggestion = suggestMedName(name, known);
  // Хвост рисуем, только если ввод не кончается пробелом — иначе он отъедет от текста
  const tail = suggestion && name === name.trimEnd() ? suggestion.slice(name.trim().length) : '';

  const close = () => {
    setOpen(false);
    setName('');
    setDose('');
    setTime('');
  };
  const add = () => {
    const n = name.trim();
    if (!n) return;
    onChange([...meds, { name: n, ...(dose.trim() ? { dose: dose.trim() } : {}), ...(time ? { time } : {}) }]);
    onRemember(n);
    close();
  };
  // pointerdown + preventDefault: поле не теряет фокус, клавиатура не закрывается
  const accept = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (suggestion) setName(suggestion);
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

      {open ? (
        <div className="med-form">
          <div className={`med-field is-floating ${name ? 'has-value' : ''}`}>
            <label htmlFor={`${id}-name`}>Название</label>
            <span className="med-ghost" aria-hidden="true">
              <span className="med-ghost-typed">{name}</span>
              {tail && <span key={suggestion} className="med-ghost-tail">{tail}</span>}
            </span>
            <input
              id={`${id}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  doseRef.current?.focus();
                }
              }}
              enterKeyHint="next"
              autoComplete="off"
              autoCapitalize="sentences"
              autoFocus
            />
            {suggestion && (
              <button
                type="button"
                className="med-accept"
                aria-label={`Вставить ${suggestion}`}
                onPointerDown={accept}
                onMouseDown={(e) => e.preventDefault()}
                onClick={accept}
              >
                <CheckIcon size={18} /> Вставить
              </button>
            )}
          </div>
          <div className="med-form-row">
            <div className="med-field">
              <label htmlFor={`${id}-dose`}>Дозировка</label>
              <input id={`${id}-dose`} ref={doseRef} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="400 мг" />
            </div>
            <div className="med-field">
              <label htmlFor={`${id}-time`}>Время</label>
              <input id={`${id}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="med-form-actions">
            <button type="button" className="med-btn is-cancel" onClick={close}>Отмена</button>
            <button type="button" className="med-btn is-add" onClick={add}>Добавить</button>
          </div>
        </div>
      ) : (
        <button type="button" className="med-add" onClick={() => setOpen(true)}>+ Лекарство</button>
      )}
    </section>
  );
}
