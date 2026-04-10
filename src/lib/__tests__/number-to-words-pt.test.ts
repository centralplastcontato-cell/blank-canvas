import { describe, it, expect } from 'vitest';
import { numberToWordsBRL, parseBRLToNumber } from '@/lib/number-to-words-pt';

describe('parseBRLToNumber', () => {
  it('parses R$ strings', () => {
    expect(parseBRLToNumber('R$ 6.764,00')).toBe(6764);
    expect(parseBRLToNumber('R$ 1.500,50')).toBe(1500.5);
    expect(parseBRLToNumber('R$ 270,00')).toBe(270);
  });
  it('handles numbers directly', () => {
    expect(parseBRLToNumber(1234)).toBe(1234);
  });
  it('returns null for invalid', () => {
    expect(parseBRLToNumber(null)).toBeNull();
    expect(parseBRLToNumber('')).toBeNull();
  });
});

describe('numberToWordsBRL', () => {
  it('converts basic values', () => {
    expect(numberToWordsBRL(0)).toBe('zero reais');
    expect(numberToWordsBRL(1)).toBe('um real');
    expect(numberToWordsBRL(10)).toBe('dez reais');
    expect(numberToWordsBRL(100)).toBe('cem reais');
    expect(numberToWordsBRL(101)).toBe('cento e um reais');
  });

  it('converts thousands', () => {
    expect(numberToWordsBRL(1000)).toBe('um mil reais');
    expect(numberToWordsBRL(1500)).toBe('um mil e quinhentos reais');
    expect(numberToWordsBRL(6764)).toBe('seis mil e setecentos e sessenta e quatro reais');
    expect(numberToWordsBRL(2000)).toBe('dois mil reais');
  });

  it('converts with cents', () => {
    expect(numberToWordsBRL(1500.50)).toBe('um mil e quinhentos reais e cinquenta centavos');
    expect(numberToWordsBRL(0.01)).toBe('um centavo');
    expect(numberToWordsBRL(1.01)).toBe('um real e um centavo');
  });

  it('converts from BRL string', () => {
    expect(numberToWordsBRL('R$ 6.674,00')).toBe('seis mil e seiscentos e setenta e quatro reais');
    expect(numberToWordsBRL('R$ 270,00')).toBe('duzentos e setenta reais');
  });

  it('handles tens and teens', () => {
    expect(numberToWordsBRL(11)).toBe('onze reais');
    expect(numberToWordsBRL(19)).toBe('dezenove reais');
    expect(numberToWordsBRL(20)).toBe('vinte reais');
    expect(numberToWordsBRL(21)).toBe('vinte e um reais');
  });

  it('handles millions', () => {
    expect(numberToWordsBRL(1000000)).toBe('um milhão reais');
    expect(numberToWordsBRL(2500000)).toBe('dois milhões e quinhentos mil reais');
  });

  it('returns empty for null/negative', () => {
    expect(numberToWordsBRL(null)).toBe('');
    expect(numberToWordsBRL(-1)).toBe('');
  });
});
