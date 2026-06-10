import { SettlementService } from '../../src/domain/invoice/settlement.service';
import { Invoice } from '../../src/domain/invoice/invoice';
import { Merchant } from '../../src/domain/merchant/merchant';
import { Money } from '../../src/domain/shared/money';
import { Currency } from '../../src/domain/shared/currency';
import { FeePolicy } from '../../src/domain/invoice/fee-policy';

const USD = Currency.of('USD');

function pendingInvoice() {
  return Invoice.create({
    id: '64b7f0e2c2a4f3a1b2c3d4e5',
    merchantId: '64b7f0e2c2a4f3a1b2c3d4e6',
    amount: Money.of(10_000, USD),
    feePolicy: FeePolicy.ofBasisPoints(250),
  });
}

function merchant() {
  return Merchant.create({
    id: '64b7f0e2c2a4f3a1b2c3d4e6',
    name: 'Acme',
    feePolicy: FeePolicy.ofBasisPoints(250),
  });
}

describe('SettlementService', () => {
  it('paid: финализирует счёт и возвращает сумму зачисления', () => {
    const invoice = pendingInvoice();
    const m = merchant();

    const { creditAmount } = SettlementService.apply(invoice, m, 'paid');

    expect(invoice.status).toBe('paid');
    expect(creditAmount?.amountMinor).toBe(9_750);
    expect(m.balanceMinor).toBe(9_750);
  });

  it('failed: финализирует без зачисления', () => {
    const invoice = pendingInvoice();
    const m = merchant();

    const { creditAmount } = SettlementService.apply(invoice, m, 'failed');

    expect(invoice.status).toBe('failed');
    expect(creditAmount).toBeNull();
    expect(m.balanceMinor).toBe(0);
  });

  it('не трогает уже финализированный счёт', () => {
    const invoice = pendingInvoice();
    const m = merchant();
    SettlementService.apply(invoice, m, 'paid');

    const retry = SettlementService.apply(invoice, m, 'paid');
    expect(retry.creditAmount).toBeNull();
    expect(m.balanceMinor).toBe(9_750);
  });
});
