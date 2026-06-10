import { Invoice } from '../../src/domain/invoice/invoice';
import { Money } from '../../src/domain/shared/money';
import { Currency } from '../../src/domain/shared/currency';
import { FeePolicy } from '../../src/domain/invoice/fee-policy';

const USD = Currency.of('USD');

describe('Invoice.restore', () => {
  const baseProps = {
    id: '64b7f0e2c2a4f3a1b2c3d4e5',
    merchantId: '64b7f0e2c2a4f3a1b2c3d4e6',
    amount: Money.of(10_000, USD),
    feePolicy: FeePolicy.ofBasisPoints(250),
    fee: Money.of(250, USD),
    amountToReceive: Money.of(9_750, USD),
    status: 'pending' as const,
    settledAt: null,
    createdAt: new Date(),
    version: 0,
  };

  it('принимает корректные данные', () => {
    const invoice = Invoice.restore(baseProps);
    expect(invoice.amountToReceive.amountMinor).toBe(9_750);
  });

  it('отклоняет несогласованный amountToReceive', () => {
    expect(() =>
      Invoice.restore({
        ...baseProps,
        amountToReceive: Money.of(9_000, USD),
      }),
    ).toThrow();
  });
});
