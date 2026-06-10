import Redis from 'ioredis';

/**
 * Минимальный интерфейс, который реально нужен от Redis (SET NX EX).
 * Позволяет в тестах подменять реализацию (ioredis-mock) без привязки к классу.
 */
export interface RedisLike {
  set(
    key: string,
    value: string,
    expiryMode: 'EX',
    seconds: number,
    setMode: 'NX',
  ): Promise<'OK' | null>;
  quit(): Promise<unknown>;
}

let client: RedisLike | null = null;

export function initRedis(url: string): RedisLike {
  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  }) as unknown as RedisLike;
  return client;
}

export function getRedisClient(): RedisLike {
  if (!client) {
    throw new Error('Redis client is not initialized. Call initRedis() first.');
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
