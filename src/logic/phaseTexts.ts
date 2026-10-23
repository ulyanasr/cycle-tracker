// Тексты карточек «Тело сейчас» и «Спорт сегодня»
import type { Phase } from './cycle';

export const PHASE_TITLE: Record<Phase, string> = {
  menstrual: 'Менструальная фаза',
  follicular: 'Фолликулярная фаза',
  ovulatory: 'Овуляторная фаза',
  luteal: 'Лютеиновая фаза',
};

export const BODY_TEXT: Record<Phase, string> = {
  menstrual: 'Возможны спазмы, усталость, энергии меньше.',
  follicular: 'Энергия растёт, восстановление быстрее.',
  ovulatory: 'Пик энергии. Возможна лёгкая тянущая боль внизу живота.',
  luteal: 'Может расти аппетит. Ближе к месячным — вздутие и чувствительная грудь.',
};

/** Первые 2 дня после окончания месячных — вместо текста фазы */
export const AFTER_PERIOD_TEXT = 'Пара дней коричневых мажущих выделений после месячных — это нормально.';

export const SPORT_TEXT: Record<Phase, { run: string; strength: string; yoga: string }> = {
  menstrual: { run: 'лёгкий, по самочувствию', strength: 'облегчённые', yoga: 'мягкая, без перевёрнутых поз' },
  follicular: { run: 'можно интервалы', strength: 'можно прибавлять', yoga: 'любая' },
  ovulatory: { run: 'ок для скоростной работы', strength: 'ок, следи за техникой', yoga: 'любая' },
  luteal: {
    run: 'как обычно, к концу фазы легче',
    strength: 'как обычно, к концу снижай объём',
    yoga: 'любая, к концу мягче',
  },
};
