import { Request, Response, NextFunction } from 'express';
import { NonceStore } from '../../../application/ports/nonce-store';
import { AsyncRequestHandler } from '../shared/async-handler';
import { ValidationError, UnauthorizedError, ConflictError } from '../shared/errors';
import { buildSignaturePayload, verifySignature } from './signature';
import { webhookHeadersSchema, webhookBodySchema } from './webhook.dto';

export interface WebhookAuthConfig {
  nonceStore: NonceStore;
  secret: string;
  toleranceSeconds: number;
}

/**
 * Аутентификация webhook (транспортный уровень) ДО бизнес-логики:
 *  1) обязательные заголовки;
 *  2) актуальность timestamp (окно ±tolerance);
 *  3) HMAC-SHA256 подпись (timing-safe);
 *  4) валидность тела;
 *  5) уникальность nonce (атомарный резерв).
 *
 * Порядок важен: nonce резервируем только после проверки подписи (чтобы
 * неаутентифицированный запрос не «сжигал» чужие nonce) и после валидации тела.
 * TTL nonce = 2×tolerance, т.к. окно валидности timestamp двустороннее.
 */
export function makeWebhookAuth(config: WebhookAuthConfig): AsyncRequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const headers = webhookHeadersSchema.safeParse(req.headers);
    if (!headers.success) {
      throw new ValidationError('Missing webhook headers', headers.error.flatten());
    }

    const signature = headers.data['x-signature'];
    const timestamp = headers.data['x-timestamp'];
    const nonce = headers.data['x-nonce'];

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      throw new ValidationError('X-Timestamp must be a unix timestamp (seconds)');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > config.toleranceSeconds) {
      throw new UnauthorizedError('Webhook timestamp is outside the allowed window');
    }

    const rawBody = req.rawBody ?? '';
    const payload = buildSignaturePayload(timestamp, nonce, rawBody);
    if (!verifySignature(config.secret, payload, signature)) {
      throw new UnauthorizedError('Invalid webhook signature');
    }

    const body = webhookBodySchema.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError('Invalid webhook body', body.error.flatten());
    }

    const reserved = await config.nonceStore.reserve(nonce, config.toleranceSeconds * 2);
    if (!reserved) {
      throw new ConflictError('Webhook nonce already used (replay detected)', 'REPLAY_DETECTED');
    }

    req.webhookBody = body.data;
    next();
  };
}
