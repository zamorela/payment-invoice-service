import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { UnauthorizedError, ValidationError, ConflictError } from '../utils/errors';
import { buildSignaturePayload, verifySignature } from './signature';
import { reserveNonce } from './nonce.service';
import { webhookHeadersSchema, webhookBodySchema } from './webhook.schemas';

/**
 * Полная проверка подлинности webhook ДО обработки бизнес-логики:
 *  1) наличие обязательных заголовков;
 *  2) актуальность timestamp (защита от replay по времени);
 *  3) корректность HMAC-SHA256 подписи (timing-safe);
 *  4) валидность тела;
 *  5) уникальность nonce (атомарный резерв в Redis).
 *
 * Порядок важен:
 *  - nonce резервируем только после успешной проверки подписи, чтобы
 *    неаутентифицированный запрос не «сжигал» чужие nonce;
 *  - тело валидируем до резерва nonce, чтобы корректно подписанный, но
 *    структурно некорректный запрос не блокировал легитимный повтор.
 */
export async function verifyWebhook(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const headers = webhookHeadersSchema.safeParse(req.headers);
  if (!headers.success) {
    throw new ValidationError('Missing webhook headers', headers.error.flatten());
  }

  const signature = headers.data['x-signature'];
  const timestamp = headers.data['x-timestamp'];
  const nonce = headers.data['x-nonce'];

  // 2) Проверка окна времени: запрос валиден в диапазоне ±tolerance.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    throw new ValidationError('X-Timestamp must be a unix timestamp (seconds)');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > env.WEBHOOK_TOLERANCE_SECONDS) {
    throw new UnauthorizedError('Webhook timestamp is outside the allowed window');
  }

  // 3) Проверка подписи над каноническим payload (включает заголовки и сырое тело).
  const rawBody = req.rawBody ?? '';
  const payload = buildSignaturePayload(timestamp, nonce, rawBody);
  if (!verifySignature(env.WEBHOOK_SECRET, payload, signature)) {
    throw new UnauthorizedError('Invalid webhook signature');
  }

  // 4) Валидация тела до резерва nonce.
  const body = webhookBodySchema.safeParse(req.body);
  if (!body.success) {
    throw new ValidationError('Invalid webhook body', body.error.flatten());
  }

  // 5) Резерв nonce последним шагом. TTL = 2×окна: окно валидности timestamp
  // двустороннее (±tolerance, ширина 2×tolerance), поэтому nonce должен жить
  // как минимум столько же, иначе на границе окна возможен повтор.
  const reserved = await reserveNonce(nonce, env.WEBHOOK_TOLERANCE_SECONDS * 2);
  if (!reserved) {
    throw new ConflictError('Webhook nonce already used (replay detected)', 'REPLAY_DETECTED');
  }

  req.webhookBody = body.data;
  next();
}
