import { NonceStore } from '../../application/ports/nonce-store';
import { RedisLike } from '../config/redis';

const NONCE_PREFIX = 'webhook:nonce:';

/**
 * Redis-реализация NonceStore. SET key value NX EX ttl возвращает 'OK' только
 * если ключа ещё не было — это даёт атомарный «занять один раз» даже при
 * одновременных запросах.
 */
export class RedisNonceStore implements NonceStore {
  constructor(private readonly redis: RedisLike) {}

  async reserve(nonce: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(`${NONCE_PREFIX}${nonce}`, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
