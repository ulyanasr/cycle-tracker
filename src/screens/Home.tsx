import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MenuIcon } from '../components/Icons';

type Props = { onMenu: () => void };

// «Ср, 14 октября»: date-fns даёт «ср», первую букву делаем заглавной
function todayLabel(date: Date) {
  const s = format(date, 'EEEEEE, d MMMM', { locale: ru });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Home({ onMenu }: Props) {
  return (
    <main className="screen">
      <div className="top-bar">
        <button className="round-btn" aria-label="Открыть меню" onClick={onMenu}>
          <MenuIcon />
        </button>
        <span className="pill">{todayLabel(new Date())}</span>
      </div>
      <h1 className="screen-title">Главная</h1>
      <p className="placeholder">Фаза, карточки и календарь появятся на этапе 5.</p>
    </main>
  );
}
