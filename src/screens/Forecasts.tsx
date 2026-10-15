// «Как считаются прогнозы» (5.7)
import { BackIcon } from '../components/Icons';
import './Forecasts.css';

const ITEMS = [
  {
    dot: 'var(--coral)',
    title: 'Следующие месячные',
    text: 'Начало последних месячных + твой средний цикл. Если цикл скачет, в календаре закрашивается несколько вероятных дней.',
  },
  {
    dot: 'var(--period-forecast)',
    ring: true,
    title: 'Конец месячных',
    text: 'День начала + твоя средняя длина месячных. Отметишь «Закончились» раньше или позже — пересчитается.',
  },
  { dot: 'var(--indigo)', title: 'Овуляция', text: 'Примерно за 14 дней до следующих месячных.' },
  { dot: 'var(--fertile-2)', title: 'Фертильное окно', text: 'Около 5 дней до овуляции и день после неё.' },
  {
    dot: 'var(--text)',
    title: 'Средние значения',
    text: 'Все циклы текущего года, включая месяцы, отмеченные при первом запуске. Промежутки длиннее 60 дней без отметок не учитываются.',
  },
];

export function Forecasts({ onBack }: { onBack: () => void }) {
  return (
    <main className="screen">
      <div className="top-bar">
        <button className="round-btn" aria-label="Назад" onClick={onBack}>
          <BackIcon />
        </button>
      </div>
      <div>
        <h1 className="screen-title is-compact">Как считаются прогнозы</h1>
        <p className="forecast-lead">
          Все прогнозы строятся по твоим отметкам за текущий год. Чем больше циклов, тем точнее.
        </p>
      </div>

      <ul className="forecast-list">
        {ITEMS.map((it) => (
          <li key={it.title} className="forecast-card">
            <i
              aria-hidden="true"
              style={{ background: it.dot, boxShadow: it.ring ? 'inset 0 0 0 1.5px #F4A9A2' : undefined }}
            />
            <div>
              <h2>{it.title}</h2>
              <p>{it.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <aside className="forecast-note">
        <h2>Это оценка</h2>
        <p>Прогнозы не подходят для контрацепции. Описания фаз — общая информация, не медицинский совет.</p>
      </aside>
    </main>
  );
}
