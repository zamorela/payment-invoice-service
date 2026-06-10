import { Invoice } from '../../../domain/invoice/invoice';

/**
 * Преобразует доменный агрегат в публичный JSON-ответ. Денежные значения
 * отдаём в минорных единицах (целые числа).
 */
export function presentInvoice(invoice: Invoice) {
  return {
    invoiceId: invoice.id,
    merchantId: invoice.merchantId,
    amount: invoice.amount.amountMinor,
    currency: invoice.amount.currency.code,
    fee: invoice.fee.amountMinor,
    amountToReceive: invoice.amountToReceive.amountMinor,
    status: invoice.status,
    settledAt: invoice.settledAt,
    createdAt: invoice.createdAt,
  };
}
