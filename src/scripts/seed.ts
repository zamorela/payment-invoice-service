import { connectMongo, disconnectMongo } from '../infrastructure/config/mongoose';
import { env } from '../infrastructure/config/env';
import { buildApplicationServices } from '../composition-root';

/**
 * Создаёт тестового мерчанта (комиссия 2.5%) через use case.
 */
async function main(): Promise<void> {
  await connectMongo(env.MONGO_URI);
  const { createMerchant } = buildApplicationServices();
  const merchant = await createMerchant.execute({ name: 'Demo Merchant', feeBps: 250 });
  // eslint-disable-next-line no-console
  console.log('Created merchant:');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ merchantId: merchant.id, feeBps: merchant.feePolicy.basisPoints }, null, 2));
  await disconnectMongo();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
