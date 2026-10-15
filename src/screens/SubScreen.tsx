import type { ReactNode } from 'react';
import { BackIcon } from '../components/Icons';

type Props = { title: string; onBack: () => void; children?: ReactNode };

// Общий каркас для «Истории циклов» и «Как считаются прогнозы»
export function SubScreen({ title, onBack, children }: Props) {
  return (
    <main className="screen">
      <div className="top-bar">
        <button className="round-btn" aria-label="Назад" onClick={onBack}>
          <BackIcon />
        </button>
      </div>
      <h1 className="screen-title">{title}</h1>
      {children}
    </main>
  );
}
