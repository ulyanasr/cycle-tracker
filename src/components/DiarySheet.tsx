import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toDate, type DateStr } from '../logic/dates';
import { capitalize } from '../logic/months';
import { CloseIcon } from './Icons';
import './Overlays.css';

type Props = { date: DateStr | null; onClose: () => void };

export function DiarySheet({ date, onClose }: Props) {
  const open = date !== null;
  return (
    <div className={`overlay ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Дневник дня">
        <div className="sheet-handle" />
        <div className="overlay-head">
          <h2>{date ? capitalize(format(toDate(date), 'EEEE, d MMMM', { locale: ru })) : ''}</h2>
          <button className="round-btn" aria-label="Закрыть дневник" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className="placeholder">Блоки дневника появятся на этапе 6.</p>
      </section>
    </div>
  );
}
