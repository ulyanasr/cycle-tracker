import { HomeIcon, NotesIcon, PlusIcon } from './Icons';
import './BottomNav.css';

type Props = {
  current: 'home' | 'notes' | null;
  onHome: () => void;
  onAdd: () => void;
  onNotes: () => void;
};

// Плавающая панель-«таблетка». Цвета кнопок одинаковые на всех экранах
export function BottomNav({ current, onHome, onAdd, onNotes }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Навигация">
      <button
        className="nav-btn nav-home"
        aria-label="Главная"
        aria-current={current === 'home' ? 'page' : undefined}
        onClick={onHome}
      >
        <HomeIcon />
      </button>
      <button className="nav-btn nav-add" aria-label="Дневник за сегодня" onClick={onAdd}>
        <PlusIcon size={26} />
      </button>
      <button
        className="nav-btn nav-notes"
        aria-label="Заметки"
        aria-current={current === 'notes' ? 'page' : undefined}
        onClick={onNotes}
      >
        <NotesIcon />
      </button>
    </nav>
  );
}
