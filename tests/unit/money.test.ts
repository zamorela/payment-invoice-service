import { computeFee } from '../../src/utils/money';

describe('computeFee', () => {
  it('считает комиссию и сумму к зачислению (2.5% = 250 bps)', () => {
    // 100.00 -> 10000 минорных единиц, 2.5% = 250 к зачислению 9750
    expect(computeFee(10_000, 250)).toEqual({
      amount: 10_000,
      fee: 250,
      amountToReceive: 9_750,
    });
  });

  it('нулевая комиссия отдаёт всю сумму', () => {
    expect(computeFee(9_999, 0)).toEqual({
      amount: 9_999,
      fee: 0,
      amountToReceive: 9_999,
    });
  });

  it('округляет половину вверх (round half up)', () => {
    // 101 * 250 / 10000 = 2.525 -> 3
    expect(computeFee(101, 250).fee).toBe(3);
    // 1 * 5000 / 10000 = 0.5 -> 1
    expect(computeFee(1, 5_000).fee).toBe(1);
  });

  it('сумма к зачислению всегда = amount - fee', () => {
    const { amount, fee, amountToReceive } = computeFee(123_457, 137);
    expect(amountToReceive).toBe(amount - fee);
  });

  it('точен на больших суммах в безопасном целочисленном диапазоне (bigint-путь)', () => {
    const safeAmount = 1_000_000_000_000; // 10 млрд минорных единиц
    const { fee, amountToReceive } = computeFee(safeAmount, 250);
    expect(fee).toBe(25_000_000_000);
    expect(amountToReceive).toBe(975_000_000_000);
  });

  it('отклоняет некорректные входные данные', () => {
    expect(() => computeFee(0, 250)).toThrow();
    expect(() => computeFee(-5, 250)).toThrow();
    expect(() => computeFee(10.5, 250)).toThrow();
    expect(() => computeFee(100, -1)).toThrow();
    expect(() => computeFee(100, 10_001)).toThrow();
  });
});
