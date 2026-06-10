import RedisMock from 'ioredis-mock';
import { RedisNonceStore } from '../../src/infrastructure/redis/redis-nonce-store';
import { RedisLike } from '../../src/infrastructure/config/redis';
import { buildApplicationServices } from '../../src/composition-root';
import { createApp } from '../../src/interfaces/http/app';
import { makeWebhookAuth } from '../../src/interfaces/http/webhook/webhook-auth.middleware';

export const TEST_WEBHOOK_SECRET = 'test-webhook-secret';

export function buildTestApp() {
  const redis = new RedisMock();
  const nonceStore = new RedisNonceStore(redis as unknown as RedisLike);
  const services = buildApplicationServices();

  const app = createApp({
    ...services,
    webhookAuth: makeWebhookAuth({
      nonceStore,
      secret: TEST_WEBHOOK_SECRET,
      toleranceSeconds: 300,
    }),
  });

  return { app, redis, services };
}
