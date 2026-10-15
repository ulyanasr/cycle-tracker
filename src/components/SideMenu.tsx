import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { exportBackup, useBackupData } from '../db/backupIO';
import { useToday } from '../hooks/useToday';
import { yearStats } from '../logic/cycle';
import { yearOf } from '../logic/dates';
import { ChartIcon, CloseIcon, DownloadIcon, InfoIcon, UploadIcon } from './Icons';
import { ImportButton } from './ImportButton';
import './Overlays.css';
import './SideMenu.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onHistory: () => void;
  onForecasts: () => void;
};

export function SideMenu({ open, onClose, onHistory, onForecasts }: Props) {
  const today = useToday();
  const data = useBackupData();
  const stats = data ? yearStats(data.periods, yearOf(today)) : null;
  const lastExport = data?.settings.lastExportAt;

  const onExport = async () => {
    if (!data) return;
    try {
      await exportBackup(data);
    } catch {
      alert('Не получилось сохранить файл. Попробуй ещё раз.');
    }
  };

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

        <div className="menu-stats">
          <div className="menu-stat is-indigo">
            <span>Средний цикл</span>
            <b>{stats?.avgCycle ?? '—'} дн.</b>
          </div>
          <div className="menu-stat is-coral">
            <span>Месячные</span>
            <b>{stats?.avgPeriod ?? '—'} дн.</b>
          </div>
        </div>

        <nav className="menu-list">
          <button className="menu-item" onClick={onHistory}>
            <span className="menu-icon"><ChartIcon /></span>
            <span className="menu-text">История циклов</span>
          </button>
          <button className="menu-item is-lime" onClick={onExport} disabled={!data}>
            <span className="menu-icon"><DownloadIcon /></span>
            <span className="menu-text">
              Экспорт в Файлы
              <small>
                Последний бэкап: {lastExport ? format(new Date(lastExport), 'd MMMM', { locale: ru }) : 'ещё не было'}
              </small>
            </span>
          </button>
          <ImportButton className="menu-item" onDone={onClose}>
            <span className="menu-icon"><UploadIcon /></span>
            <span className="menu-text">Импорт из файла</span>
          </ImportButton>
          <button className="menu-item" onClick={onForecasts}>
            <span className="menu-icon"><InfoIcon /></span>
            <span className="menu-text">Как считаются прогнозы</span>
          </button>
        </nav>

        <p className="menu-footnote">
          Данные хранятся только на этом iPhone. Прогноз фертильного окна — оценка, не для контрацепции.
        </p>
      </aside>
    </div>
  );
}
