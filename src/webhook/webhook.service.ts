import mongoose from 'mongoose';
import { InvoiceModel, InvoiceDoc, InvoiceStatus } from '../models/invoice.model';
import { MerchantModel } from '../models/merchant.model';
import { NotFoundError } from '../utils/errors';
import { WebhookStatus } from './webhook.schemas';

export interface WebhookResult {
  invoice: InvoiceDoc;
  /** true — счёт был переведён в финальный статус именно этим запросом. */
  applied: boolean;
}

/**
 * Применяет статус оплаты к счёту.
 *
 * Ключевое требование: при status=paid зачисление должно произойти РОВНО ОДИН РАЗ,
 * даже при повторной/конкурентной доставке webhook.
 *
 * Гарантии:
 *  1) Атомарный переход статуса через findOneAndUpdate({ status: 'pending' }):
 *     среди любого числа конкурентных/повторных webhook переход
 *     pending -> paid|failed «выигрывает» ровно один запрос.
 *  2) Смена статуса и зачисление баланса выполняются в ОДНОЙ транзакции,
 *     поэтому невозможно состояние «статус paid, но баланс не пополнен»
 *     (или наоборот): либо коммитятся обе записи, либо ни одной.
 *
 * Требует MongoDB как member реплика-сета (стандартно для прод-развёртываний,
 * включая MongoDB Atlas) — это условие работы транзакций.
 */
export async function processWebhook(
  invoiceId: string,
  status: WebhookStatus,
): Promise<WebhookResult> {
  const finalStatus: InvoiceStatus = status;
  const session = await mongoose.startSession();

  try {
    let result: WebhookResult | undefined;

    await session.withTransaction(async () => {
      const updated = await InvoiceModel.findOneAndUpdate(
        { _id: invoiceId, status: 'pending' },
        { $set: { status: finalStatus, settledAt: new Date() } },
        { new: true, session },
      );

      if (updated) {
        // Победитель перехода: для paid пополняем баланс мерчанта ровно один раз,
        // атомарно вместе со сменой статуса.
        if (finalStatus === 'paid') {
          await MerchantModel.updateOne(
            { _id: updated.merchantId },
            { $inc: { balance: updated.amountToReceive } },
            { session },
          );
        }
        result = { invoice: updated, applied: true };
        return;
      }

      // Перехода не было: либо счёта нет, либо он уже финализирован (повтор).
      const existing = await InvoiceModel.findById(invoiceId).session(session);
      if (!existing) {
        throw new NotFoundError('Invoice not found');
      }
      result = { invoice: existing, applied: false };
    });

    return result as WebhookResult;
  } finally {
    await session.endSession();
  }
}
