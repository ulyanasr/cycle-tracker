import { CloseIcon } from './Icons';
import './Overlays.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onHistory: () => void;
  onForecasts: () => void;
};

export function SideMenu({ open, onClose, onHistory, onForecasts }: Props) {
  return (
    <div className={`overlay ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Меню">
        <div className="overlay-head">
          <h2>Меню</h2>
          <button className="round-btn" aria-label="Закрыть меню" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="menu-list">
          <button className="menu-item" onClick={onHistory}>История циклов</button>
          <button className="menu-item" onClick={onForecasts}>Как считаются прогнозы</button>
        </nav>
        <p className="placeholder">Карточки средних, экспорт и импорт появятся на этапе 8.</p>
      </aside>
    </div>
  );
}
