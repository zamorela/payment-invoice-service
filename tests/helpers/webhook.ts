import crypto from 'crypto';
import { buildSignaturePayload } from '../../src/webhook/signature';

export interface SignedWebhook {
  body: string;
  headers: Record<string, string>;
}

let nonceCounter = 0;

/**
 * Формирует валидно подписанный webhook-запрос (тело + заголовки).
 * Позволяет переопределить отдельные поля для негативных сценариев.
 */
export function signWebhook(params: {
  payload: object;
  secret: string;
  nonce?: string;
  timestamp?: number;
}): SignedWebhook {
  const body = JSON.stringify(params.payload);
  const nonce = params.nonce ?? `nonce-${Date.now()}-${nonceCounter++}`;
  const timestamp = String(params.timestamp ?? Math.floor(Date.now() / 1000));

  const signature = crypto
    .createHmac('sha256', params.secret)
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
