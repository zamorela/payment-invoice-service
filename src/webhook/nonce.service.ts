import { getRedisClient } from '../config/redis';

const NONCE_PREFIX = 'webhook:nonce:';

/**
 * Атомарно резервирует nonce в Redis на время окна актуальности.
 * SET key value NX EX ttl возвращает 'OK' только если ключа ещё не было —
 * это гарантирует, что один nonce будет принят ровно один раз даже при
 * одновременных (конкурентных) запросах.
 *
 * @returns true — nonce занят впервые (запрос валиден); false — повтор.
 */
export async function reserveNonce(nonce: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.set(`${NONCE_PREFIX}${nonce}`, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}
