import { Money } from '../../src/domain/shared/money';
import { Currency } from '../../src/domain/shared/currency';
import { FeePolicy } from '../../src/domain/invoice/fee-policy';

const USD = Currency.of('USD');

describe('FeePolicy.computeFee', () => {
  it('считает комиссию 2.5% = 250 bps', () => {
    const fee = FeePolicy.ofBasisPoints(250).computeFee(Money.of(10_000, USD));
    expect(fee.amountMinor).toBe(250);
  });

  it('нулевая комиссия отдаёт 0', () => {
    const fee = FeePolicy.ofBasisPoints(0).computeFee(Money.of(9_999, USD));
    expect(fee.amountMinor).toBe(0);
  });

  it('округляет половину вверх (round half up)', () => {
    // 101 * 250 / 10000 = 2.525 -> 3
    expect(FeePolicy.ofBasisPoints(250).computeFee(Money.of(101, USD)).amountMinor).toBe(3);
    // 1 * 5000 / 10000 = 0.5 -> 1
    expect(FeePolicy.ofBasisPoints(5_000).computeFee(Money.of(1, USD)).amountMinor).toBe(1);
  });

  it('точен на больших суммах (bigint-путь)', () => {
    const fee = FeePolicy.ofBasisPoints(250).computeFee(Money.of(1_000_000_000_000, USD));
    expect(fee.amountMinor).toBe(25_000_000_000);
  });

  it('отклоняет некорректные bps', () => {
    expect(() => FeePolicy.ofBasisPoints(-1)).toThrow();
    expect(() => FeePolicy.ofBasisPoints(10_001)).toThrow();
    expect(() => FeePolicy.ofBasisPoints(1.5)).toThrow();
  });
});

describe('Money', () => {
  it('amountToReceive = amount - fee', () => {
    const amount = Money.of(123_457, USD);
    const fee = FeePolicy.ofBasisPoints(137).computeFee(amount);
    expect(amount.minus(fee).amountMinor).toBe(123_457 - fee.amountMinor);
  });

  it('отклоняет дробные/отрицательные суммы', () => {
    expect(() => Money.of(10.5, USD)).toThrow();
    expect(() => Money.of(-5, USD)).toThrow();
  });

  it('запрещает операции над разными валютами', () => {
    expect(() => Money.of(100, USD).minus(Money.of(10, Currency.of('EUR')))).toThrow();
  });
});

describe('Currency', () => {
  it('нормализует регистр и валидирует формат', () => {
    expect(Currency.of('usd').code).toBe('USD');
    expect(() => Currency.of('US')).toThrow();
    expect(() => Currency.of('US1')).toThrow();
  });
});
