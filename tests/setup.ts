import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import RedisMock from 'ioredis-mock';
import { setRedisClient, RedisLike } from '../src/config/redis';

// Реплика-сет (а не standalone) нужен, потому что зачисление выполняется
// в MongoDB-транзакции (см. webhook.service). Один узел достаточно.
let mongoServer: MongoMemoryReplSet;
let redisMock: InstanceType<typeof RedisMock>;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());

  redisMock = new RedisMock();
  setRedisClient(redisMock as unknown as RedisLike);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  await redisMock.flushall();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await redisMock.quit();
});
