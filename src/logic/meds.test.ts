import { describe, expect, it } from 'vitest';
import { medDetails, pruneMedNames, rememberMedName, suggestMedName } from './meds';

describe('подсказка названия', () => {
  const known = ['Ибупрофен', 'Нурофен', 'Но-шпа', 'Парацетамол'];
  it.each([
    ['иб', 'Ибупрофен'],
    ['ИБУ', 'Ибупрофен'],
    ['  иб ', 'Ибупрофен'],
    ['И', 'Ибупрофен'],
    ['па', 'Парацетамол'],
    ['Н', 'Нурофен'], // первое в списке — последнее использованное
  ])('«%s» → %s', (input, name) => {
    expect(suggestMedName(input, known)).toBe(name);
  });
  it.each([
    ['', 'пустой ввод'],
    ['   ', 'одни пробелы'],
    ['Аспирин', 'новое название'],
    ['ибупрофен', 'уже полностью совпало'],
    ['Нурофен Ф', 'текст перестал совпадать'],
    ['профен', 'с середины слова не ищем'],
  ])('«%s» → null (%s)', (input) => {
    expect(suggestMedName(input, known)).toBeNull();
  });
});

describe('rememberMedName', () => {
  it('новое встаёт первым', () => {
    expect(rememberMedName('Аспирин', ['Ибупрофен', 'Но-шпа'])).toEqual(['Аспирин', 'Ибупрофен', 'Но-шпа']);
  });
  it('уже известное — в начало без дубля, в новом написании', () => {
    expect(rememberMedName('ибупрофен', ['Но-шпа', 'Ибупрофен'])).toEqual(['ибупрофен', 'Но-шпа']);
  });
});

describe('pruneMedNames', () => {
  it('название, удалённое из единственной записи, пропадает', () => {
    expect(pruneMedNames(['Ибупрафен', 'Но-шпа'], [{ date: 'd', meds: [{ name: 'Но-шпа' }] }])).toEqual(['Но-шпа']);
  });
  it('название из другой записи остаётся, без учёта регистра', () => {
    const logs = [{ date: 'a' }, { date: 'b', meds: [{ name: 'ибупрофен' }] }];
    expect(pruneMedNames(['Ибупрофен'], logs)).toEqual(['Ибупрофен']);
  });
  it('порядок остальных сохраняется', () => {
    const logs = [{ date: 'a', meds: [{ name: 'А' }, { name: 'В' }] }, { date: 'b', meds: [{ name: 'Б' }] }];
    expect(pruneMedNames(['В', 'Х', 'А', 'Б'], logs)).toEqual(['В', 'А', 'Б']);
  });
});

describe('строка «дозировка · время»', () => {
  it('всё, только одно, ничего', () => {
    expect(medDetails({ dose: '400 мг', time: '09:30' })).toBe('400 мг · 09:30');
    expect(medDetails({ time: '09:30' })).toBe('09:30');
    expect(medDetails({})).toBe('');
  });
});
