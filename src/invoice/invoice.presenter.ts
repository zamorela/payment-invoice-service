import { InvoiceDoc } from '../models/invoice.model';

/**
 * Преобразует документ счёта в публичный JSON-ответ.
 * Денежные значения отдаём как есть — в минорных единицах (целые числа).
 */
export function presentInvoice(invoice: InvoiceDoc) {
  return {
    invoiceId: invoice._id.toString(),
    merchantId: invoice.merchantId.toString(),
    amount: invoice.amount,
    currency: invoice.currency,
    fee: invoice.fee,
    amountToReceive: invoice.amountToReceive,
    status: invoice.status,
    settledAt: invoice.settledAt ?? null,
    createdAt: invoice.get('createdAt') as Date,
  };
}
