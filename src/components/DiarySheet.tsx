import { CloseIcon } from './Icons';
import './Overlays.css';

type Props = { open: boolean; onClose: () => void };

export function DiarySheet({ open, onClose }: Props) {
  return (
    <div className={`overlay ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Дневник дня">
        <div className="sheet-handle" />
        <div className="overlay-head">
          <h2>Дневник дня</h2>
          <button className="round-btn" aria-label="Закрыть дневник" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className="placeholder">Блоки дневника появятся на этапе 6.</p>
      </section>
    </div>
  );
}
