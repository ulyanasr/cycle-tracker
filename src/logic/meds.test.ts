import { describe, expect, it } from 'vitest';
import { medDetails, suggestMeds } from './meds';

const known = ['Ибупрофен', 'Но-шпа', 'Парацетамол', 'Нурофен', 'Магний B6', 'Йод', 'Витамин D'];

describe('подсказки лекарств', () => {
  it('пустой ввод — последние 5', () => {
    expect(suggestMeds(known, '')).toEqual(known.slice(0, 5));
  });
  it('без учёта регистра', () => {
    expect(suggestMeds(known, 'ибу')).toEqual(['Ибупрофен']);
  });
  it('сначала начинающиеся с ввода, потом содержащие', () => {
    expect(suggestMeds(known, 'н')).toEqual(['Но-шпа', 'Нурофен', 'Ибупрофен', 'Магний B6', 'Витамин D']);
  });
  it('точное совпадение не подсказывается', () => {
    expect(suggestMeds(known, 'йод')).toEqual([]);
  });
  it('ничего не нашлось', () => {
    expect(suggestMeds(known, 'аспирин')).toEqual([]);
  });
});

describe('строка «дозировка · время»', () => {
  it('всё, только одно, ничего', () => {
    expect(medDetails({ dose: '400 мг', time: '09:30' })).toBe('400 мг · 09:30');
    expect(medDetails({ time: '09:30' })).toBe('09:30');
    expect(medDetails({})).toBe('');
  });
});
