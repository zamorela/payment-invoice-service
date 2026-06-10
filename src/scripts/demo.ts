import { env } from '../infrastructure/config/env';
import { connectMongo, disconnectMongo } from '../infrastructure/config/mongoose';
import { buildApplicationServices } from '../composition-root';
import { sendSignedWebhook } from './webhook-client';

const BASE = `http://localhost:${env.PORT}`;

function log(step: string, data: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`\n--- ${step} ---`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data, null, 2));
}

async function api<T>(
  method: string,
  path: string,
  body?: object,
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Demo: полный сценарий оплаты\n');

  const health = await api<{ status: string }>('GET', '/health');
  if (health.status !== 200) {
    throw new Error('Сервер не отвечает. Запусти: npm run dev');
  }
  log('1. Health', health.data);

  await connectMongo(env.MONGO_URI);
  const { createMerchant } = buildApplicationServices();
  const merchant = await createMerchant.execute({ name: 'Demo Merchant', feeBps: 250 });
  await disconnectMongo();
  log('2. Мерчант создан', { merchantId: merchant.id, feeBps: 250 });

  const created = await api<Record<string, unknown>>('POST', '/invoice', {
    amount: 10_000,
    currency: 'USD',
    merchantId: merchant.id,
  });
  if (created.status !== 201) {
    throw new Error(`Не удалось создать счёт: ${JSON.stringify(created.data)}`);
  }
  log('3. Счёт создан (pending)', created.data);

  const invoiceId = created.data.invoiceId as string;

  const pending = await api<Record<string, unknown>>('GET', `/invoice/${invoiceId}`);
  log('4. Статус до оплаты', { status: pending.data.status });

  const paid = await sendSignedWebhook(invoiceId, 'paid');
  log('5. Webhook paid (первый раз)', { http: paid.status, ...(paid.body as object) });

  const afterPaid = await api<Record<string, unknown>>('GET', `/invoice/${invoiceId}`);
  log('6. Статус после оплаты', {
    status: afterPaid.data.status,
    settledAt: afterPaid.data.settledAt,
  });

  const repeat = await sendSignedWebhook(invoiceId, 'paid');
  log('7. Webhook paid (повтор — applied должен быть false)', {
    http: repeat.status,
    ...(repeat.body as object),
  });

  // eslint-disable-next-line no-console
  console.log('\nDemo завершён.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\n', err.message ?? err);
  // eslint-disable-next-line no-console
  console.error('Убедись что запущены: npm run dev, MongoDB (replica set) и Redis');
  process.exit(1);
});
