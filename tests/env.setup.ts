/**
 * Выполняется ДО импорта модулей теста, поэтому здесь безопасно задать
 * переменные окружения, которые валидируются в src/config/env.ts при импорте.
 * MONGO_URI задаётся через mongodb-memory-server в tests/setup.ts (process.env
 * подменяется до connectMongo), здесь — заглушка, чтобы пройти валидацию.
 */
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'test-webhook-secret';
process.env.WEBHOOK_TOLERANCE_SECONDS = process.env.WEBHOOK_TOLERANCE_SECONDS ?? '300';
