import { useState, type ReactNode } from 'react';
import { HomeIcon, NotesIcon, PlusIcon } from './Icons';
import './BottomNav.css';

type Tab = 'home' | 'notes';

type Props = {
  /** null — экраны из меню, активной вкладки нет */
  current: Tab | null;
  onHome: () => void;
  onAdd: () => void;
  onNotes: () => void;
};

const PRESS_MS = 150;

export function BottomNav({ current, onHome, onAdd, onNotes }: Props) {
  const [pressed, setPressed] = useState(false);

  // «+» — действие, а не вкладка: короткий отклик, потом дневник
  const add = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => {
      setPressed(false);
      onAdd();
    }, PRESS_MS);
  };

  const tab = (name: Tab, label: string, icon: ReactNode, onClick: () => void) => (
    <button
      className={`nav-btn ${current === name ? 'is-active' : ''}`}
      aria-label={label}
      aria-current={current === name ? 'page' : undefined}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <nav className="bottom-nav" aria-label="Навигация">
      {tab('home', 'Главная', <HomeIcon />, onHome)}
      <button className={`nav-btn nav-add ${pressed ? 'is-pressed' : ''}`} aria-label="Дневник за сегодня" onClick={add}>
        <PlusIcon size={26} />
      </button>
      {tab('notes', 'Заметки', <NotesIcon />, onNotes)}
    </nav>
  );
}
