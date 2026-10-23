import { BackIcon } from '../components/Icons';
import './Forecasts.css';

const ITEMS = [
  {
    dot: 'is-forecast',
    title: 'Следующие месячные',
    text: 'Начало последних месячных + твой средний цикл. Этот день и следующие за ним дни месячных закрашены розовым.',
  },
  {
    dot: 'is-possible',
    title: 'Возможные дни',
    text: 'Если циклы разной длины, месячные могут начаться раньше прогноза. Эти дни обведены пунктиром — начиная с самого короткого из последних циклов.',
  },
  {
    dot: 'is-period',
    title: 'Конец месячных',
    text: 'День начала + твоя средняя длина месячных. Отметишь «Закончились» раньше или позже — пересчитается.',
  },
  { dot: 'is-ovulation', title: 'Овуляция', text: 'Примерно за 14 дней до следующих месячных.' },
  { dot: 'is-fertile', title: 'Фертильное окно', text: 'Около 5 дней до овуляции и день после неё.' },
  {
    dot: 'is-teal',
    title: 'Средние значения',
    text: 'Последние 6 циклов, включая отмеченные при первом запуске. Циклы короче 21 и длиннее 45 дней не учитываются — обычно это случайная отметка. Их видно в «Истории циклов».',
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
          Прогнозы строятся по твоим последним 6 циклам. Чем больше циклов, тем точнее.
        </p>
      </div>

      <ul className="forecast-list">
        {ITEMS.map((it) => (
          <li key={it.title} className="forecast-card">
            <i className={it.dot} aria-hidden="true" />
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
