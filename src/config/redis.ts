import Redis from 'ioredis';

/**
 * Минимальный интерфейс, который нам реально нужен от Redis.
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

export function createRedisClient(url: string): RedisLike {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  }) as unknown as RedisLike;
}

export function setRedisClient(custom: RedisLike): void {
  client = custom;
}

export function getRedisClient(): RedisLike {
  if (!client) {
    throw new Error('Redis client is not initialized. Call initRedis() first.');
  }
  return client;
}

export function initRedis(url: string): RedisLike {
  client = createRedisClient(url);
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
