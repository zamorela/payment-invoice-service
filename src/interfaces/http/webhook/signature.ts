import crypto from 'crypto';

/**
 * Канонический payload для подписи: "{timestamp}.{nonce}.{rawBody}".
 * Включаем timestamp и nonce, чтобы перехваченную подпись нельзя было
 * переиспользовать с другими заголовками.
 */
export function buildSignaturePayload(timestamp: string, nonce: string, rawBody: string): string {
  return `${timestamp}.${nonce}.${rawBody}`;
}

export function computeSignature(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Сравнение подписей в постоянном времени (timing-safe). Любое расхождение
 * длины/мусорный hex -> false без исключения.
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
