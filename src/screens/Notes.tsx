import { MenuIcon } from '../components/Icons';

type Props = { onMenu: () => void };

export function Notes({ onMenu }: Props) {
  return (
    <main className="screen">
      <div className="top-bar">
        <button className="round-btn" aria-label="Открыть меню" onClick={onMenu}>
          <MenuIcon />
        </button>
        <span className="pill">{new Date().getFullYear()}</span>
      </div>
      <h1 className="screen-title">Заметки</h1>
      <p className="placeholder">Лента записей и фильтры появятся на этапе 7.</p>
    </main>
  );
}
