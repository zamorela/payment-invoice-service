import crypto from 'crypto';
import { env } from '../infrastructure/config/env';
import { buildSignaturePayload } from '../interfaces/http/webhook/signature';

export type WebhookStatus = 'paid' | 'failed';

export interface WebhookSendResult {
  status: number;
  body: unknown;
}

/** Формирует заголовки и тело подписанного webhook-запроса. */
export function buildSignedWebhook(invoiceId: string, status: WebhookStatus) {
  const payload = { invoiceId, status };
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const signature = crypto
    .createHmac('sha256', env.WEBHOOK_SECRET)
    .update(buildSignaturePayload(timestamp, nonce, body), 'utf8')
    .digest('hex');

  return {
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
    },
  };
}

/** Отправляет подписанный webhook на запущенный сервер. */
export async function sendSignedWebhook(
  invoiceId: string,
  status: WebhookStatus,
  baseUrl = `http://localhost:${env.PORT}`,
): Promise<WebhookSendResult> {
  const { body, headers } = buildSignedWebhook(invoiceId, status);
  const res = await fetch(`${baseUrl}/webhook`, { method: 'POST', headers, body });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // оставляем как строку
  }
  return { status: res.status, body: parsed };
}
