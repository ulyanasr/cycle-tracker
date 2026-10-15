// Первый запуск: приветствие и два шага с календарями прошлых месяцев (5.1)
import { useMemo, useState } from 'react';
import { CycleRing } from '../components/CycleRing';
import { BackIcon, CalendarIcon, LockIcon, PencilIcon } from '../components/Icons';
import { MonthCalendar } from '../components/MonthCalendar';
import { db } from '../db/db';
import { usePeriods } from '../db/hooks';
import { updatePeriods, updateSettings } from '../db/repo';
import { isPeriodDay } from '../logic/cycle';
import { todayStr } from '../logic/dates';
import { capitalize, monthCells, monthName, monthNameIn, previousTwoMonths } from '../logic/months';
import { toggleDay } from '../logic/periods';
import { plural } from '../logic/plural';
import './Onboarding.css';

type Step = 0 | 1 | 2; // 0 — приветствие

export function Onboarding() {
  const [step, setStep] = useState<Step>(0);
  // Дата первого запуска фиксируется на время онбординга
  const today = useMemo(todayStr, []);
  const months = useMemo(() => previousTwoMonths(today), [today]);
  const periods = usePeriods() ?? [];

  const finish = () => updateSettings(db, { onboardingDone: true });

  if (step === 0) {
    return (
      <main className="onb-screen">
        <div className="onb-hero">
          <CycleRing />
        </div>
        <div>
          <h1 className="onb-title">Привет! Это твой календарь цикла</h1>
          <p className="onb-text">
            Чтобы прогнозы работали с первого дня, отметь месячные за {monthName(months[0].month)} и{' '}
            {monthName(months[1].month)}. Это займёт минуту.
          </p>
        </div>
        <ul className="onb-points">
          <li><span className="onb-tile tile-coral"><CalendarIcon /></span>Отмечай начало и конец месячных</li>
          <li><span className="onb-tile tile-lime"><PencilIcon /></span>Записывай самочувствие, когда хочется</li>
          <li><span className="onb-tile tile-teal"><LockIcon /></span>Данные хранятся только на этом iPhone</li>
        </ul>
        <div className="onb-actions">
          <button className="btn-black" onClick={() => setStep(1)}>Начать</button>
          {/* Импорт подключим на этапе 8 */}
          <button className="btn-link" onClick={() => alert('Импорт появится на этапе 8')}>
            У меня есть бэкап — импортировать
          </button>
        </div>
      </main>
    );
  }

  const month = months[step - 1];
  const marked = monthCells(month).filter((d) => d && isPeriodDay(periods, d, today)).length;
  const isLast = step === 2;
  const next = () => (isLast ? finish() : setStep(2));

  return (
    <main className="onb-screen">
      <div className="onb-top">
        <button className="round-btn" aria-label="Назад" onClick={() => setStep((step - 1) as Step)}>
          <BackIcon />
        </button>
        <span className="pill onb-step">Шаг {step} из 2</span>
      </div>
      <div className="onb-progress" aria-hidden="true">
        <span className="is-done" />
        <span className={isLast ? 'is-done' : ''} />
      </div>

      <div>
        <h1 className="onb-title">Отметь месячные в {monthNameIn(month.month)}</h1>
        <p className="onb-text">
          Тапни по дням, когда шли месячные. Не помнишь точно — отметь примерно, потом можно поправить.
        </p>
      </div>

      <MonthCalendar
        month={month}
        today={today}
        kindOf={(d) => (isPeriodDay(periods, d, today) ? 'period' : null)}
        onTap={(d) => updatePeriods(db, (ps) => toggleDay(ps, d, today))}
        header={<h2 className="onb-month">{capitalize(monthName(month.month))} {month.year}</h2>}
      />
      <p className="onb-count" aria-live="polite">
        Отмечено {marked} {plural(marked, 'день', 'дня', 'дней')}
      </p>

      <div className="onb-actions">
        <button className="btn-black" onClick={next}>
          {isLast ? 'Готово' : `Далее: ${monthName(months[1].month)}`}
        </button>
        <button className="btn-link" onClick={next}>Не помню — пропустить</button>
      </div>
    </main>
  );
}
