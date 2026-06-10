import { Invoice } from './invoice';
import { Merchant } from '../merchant/merchant';
import { Money } from '../shared/money';
import { InvoiceStatus } from './invoice-status';

export interface SettlementResult {
  /** Сумма зачисления (только для paid), иначе null. */
  creditAmount: Money | null;
}

/**
 * Доменный сервис settlement: координирует финализацию счёта и зачисление
 * мерчанту в одном месте, чтобы use case не был transaction script.
 */
export class SettlementService {
  static apply(
    invoice: Invoice,
    merchant: Merchant,
    status: Extract<InvoiceStatus, 'paid' | 'failed'>,
  ): SettlementResult {
    if (!invoice.isPending()) {
      return { creditAmount: null };
    }

    if (status === 'paid') {
      invoice.markPaid();
      merchant.credit(invoice.amountToReceive);
      return { creditAmount: invoice.amountToReceive };
    }

    invoice.markFailed();
    return { creditAmount: null };
  }
}
