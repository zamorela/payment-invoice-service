import crypto from 'crypto';

/**
 * Канонический payload для подписи: "{timestamp}.{nonce}.{rawBody}".
 *
 * Включаем timestamp и nonce в подписываемую строку, чтобы злоумышленник
 * не мог переиспользовать перехваченную подпись с другими заголовками —
 * любое изменение времени/nonce инвалидирует подпись.
 */
export function buildSignaturePayload(
  timestamp: string,
  nonce: string,
  rawBody: string,
): string {
  return `${timestamp}.${nonce}.${rawBody}`;
}

export function computeSignature(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Сравнение подписей в постоянном времени (timing-safe), чтобы исключить
 * атаки по времени отклика. Любое расхождение длины -> false без исключения.
 */
export function verifySignature(
  secret: string,
  payload: string,
  providedSignatureHex: string,
): boolean {
  const expected = computeSignature(secret, payload);
  const expectedBuf = Buffer.from(expected, 'hex');

  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(providedSignatureHex, 'hex');
  } catch {
    return false;
  }

  if (expectedBuf.length !== providedBuf.length || providedBuf.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
