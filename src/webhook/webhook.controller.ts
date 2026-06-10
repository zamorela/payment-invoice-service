import { Request, Response } from 'express';
import { processWebhook } from './webhook.service';
import { presentInvoice } from '../invoice/invoice.presenter';

/**
 * Тело уже провалидировано и аутентифицировано в verifyWebhook
 * (подпись, окно времени, уникальность nonce), поэтому здесь только
 * применяем статус и формируем ответ.
 */
export async function postWebhook(req: Request, res: Response): Promise<void> {
  const { invoiceId, status } = req.webhookBody!;

  const { invoice, applied } = await processWebhook(invoiceId, status);

  res.status(200).json({
    received: true,
    applied,
    invoice: presentInvoice(invoice),
  });
}
