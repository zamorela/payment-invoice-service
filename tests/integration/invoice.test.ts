import request from 'supertest';
import { buildTestApp } from '../helpers/app';
import { MerchantModel } from '../../src/infrastructure/persistence/merchant.schema';

const { app } = buildTestApp();

async function seedMerchant(feeBps = 250) {
  return MerchantModel.create({ name: 'Acme', feeBps });
}

describe('POST /invoice', () => {
  it('создаёт счёт со статусом pending и корректными расчётами', async () => {
    const merchant = await seedMerchant(250); // 2.5%

    const res = await request(app)
      .post('/invoice')
      .send({ amount: 10_000, currency: 'usd', merchantId: merchant.id })
      .expect(201);

    expect(res.body).toMatchObject({
      amount: 10_000,
      currency: 'USD',
      fee: 250,
      amountToReceive: 9_750,
      status: 'pending',
      merchantId: merchant.id,
    });
    expect(res.body.invoiceId).toBeDefined();
  });

  it('возвращает 400 при некорректном теле', async () => {
    const merchant = await seedMerchant();
    await request(app)
      .post('/invoice')
      .send({ amount: -1, currency: 'US', merchantId: merchant.id })
      .expect(400);
  });

  it('возвращает 404, если мерчант не найден', async () => {
    await request(app)
      .post('/invoice')
      .send({ amount: 100, currency: 'EUR', merchantId: '64b7f0e2c2a4f3a1b2c3d4e5' })
      .expect(404);
  });

  it('возвращает 400 при amount за пределами безопасного целого', async () => {
    const merchant = await seedMerchant();
    await request(app)
      .post('/invoice')
      .send({
        amount: Number.MAX_SAFE_INTEGER + 1,
        currency: 'USD',
        merchantId: merchant.id,
      })
      .expect(400);
  });
});

describe('GET /invoice/:id', () => {
  it('возвращает текущий статус счёта', async () => {
    const merchant = await seedMerchant();
    const created = await request(app)
      .post('/invoice')
      .send({ amount: 5_000, currency: 'EUR', merchantId: merchant.id })
      .expect(201);

    const res = await request(app).get(`/invoice/${created.body.invoiceId}`).expect(200);

    expect(res.body.invoiceId).toBe(created.body.invoiceId);
    expect(res.body.status).toBe('pending');
  });

  it('возвращает 404 для несуществующего счёта', async () => {
    await request(app).get('/invoice/64b7f0e2c2a4f3a1b2c3d4e5').expect(404);
  });
});
