import { Request, Response } from 'express';
import { ProcessWebhook } from '../../../application/webhook/process-webhook';
import { presentInvoice } from '../invoice/invoice.presenter';

/**
 * Тело уже провалидировано и аутентифицировано в webhook-auth middleware,
 * поэтому здесь только запускаем use case и формируем ответ.
 */
export function makePostWebhook(processWebhook: ProcessWebhook) {
  return async (req: Request, res: Response): Promise<void> => {
    const { invoiceId, status } = req.webhookBody!;

    const { invoice, applied } = await processWebhook.execute(invoiceId, status);

    res.status(200).json({
      received: true,
      applied,
      invoice: presentInvoice(invoice),
    });
  };
}
