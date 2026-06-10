import { createApp } from './app';
import { env } from './config/env';
import { connectMongo, disconnectMongo } from './config/database';
import { initRedis, disconnectRedis } from './config/redis';

async function bootstrap(): Promise<void> {
  await connectMongo(env.MONGO_URI);
  initRedis(env.REDIS_URL);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`payment-invoice-service listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close();
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
