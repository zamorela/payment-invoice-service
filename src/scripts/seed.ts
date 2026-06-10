import { connectMongo, disconnectMongo } from '../config/database';
import { env } from '../config/env';
import { MerchantModel } from '../models/merchant.model';

/**
 * Создаёт тестового мерчанта (комиссия 2.5%) и печатает его id.
 * Удобно для ручной проверки API: npm run seed
 */
async function main(): Promise<void> {
  await connectMongo(env.MONGO_URI);
  const merchant = await MerchantModel.create({ name: 'Demo Merchant', feeBps: 250 });
  // eslint-disable-next-line no-console
  console.log('Created merchant:');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ merchantId: merchant.id, feeBps: merchant.feeBps }, null, 2));
  await disconnectMongo();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
