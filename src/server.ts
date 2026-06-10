import { env } from './infrastructure/config/env';
import { connectMongo, disconnectMongo } from './infrastructure/config/mongoose';
import { initRedis, disconnectRedis } from './infrastructure/config/redis';
import { RedisNonceStore } from './infrastructure/redis/redis-nonce-store';
import { buildApplicationServices } from './composition-root';
import { createApp } from './interfaces/http/app';
import { makeWebhookAuth } from './interfaces/http/webhook/webhook-auth.middleware';

async function bootstrap(): Promise<void> {
  await connectMongo(env.MONGO_URI);
  const redis = initRedis(env.REDIS_URL);
  const nonceStore = new RedisNonceStore(redis);

  const services = buildApplicationServices();
  const app = createApp({
    ...services,
    webhookAuth: makeWebhookAuth({
      nonceStore,
      secret: env.WEBHOOK_SECRET,
      toleranceSeconds: env.WEBHOOK_TOLERANCE_SECONDS,
    }),
  });

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`payment-invoice-service listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down gracefully...`);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.allSettled([disconnectMongo(), disconnectRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start service:', err);
  process.exit(1);
});
