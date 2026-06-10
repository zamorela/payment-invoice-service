import { Merchant } from '../../src/domain/merchant/merchant';
import { FeePolicy } from '../../src/domain/invoice/fee-policy';
import { Money } from '../../src/domain/shared/money';
import { Currency } from '../../src/domain/shared/currency';

const USD = Currency.of('USD');

describe('Merchant', () => {
  it('credit увеличивает баланс', () => {
    const m = Merchant.create({
      id: '64b7f0e2c2a4f3a1b2c3d4e5',
      name: 'Acme',
      feePolicy: FeePolicy.ofBasisPoints(250),
    });
    m.credit(Money.of(500, USD));
    expect(m.balanceMinor).toBe(500);
  });

  it('отклоняет нулевое или отрицательное зачисление', () => {
    const m = Merchant.create({
      id: '64b7f0e2c2a4f3a1b2c3d4e5',
      name: 'Acme',
      feePolicy: FeePolicy.ofBasisPoints(0),
    });
    expect(() => m.credit(Money.of(0, USD))).toThrow();
  });

  it('restore отклоняет отрицательный баланс', () => {
    expect(() =>
      Merchant.restore({
        id: '1',
        name: 'X',
        feePolicy: FeePolicy.ofBasisPoints(0),
        balanceMinor: -1,
      }),
    ).toThrow();
  });
});
