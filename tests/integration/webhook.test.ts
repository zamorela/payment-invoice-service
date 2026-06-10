import request from 'supertest';
import { buildTestApp, TEST_WEBHOOK_SECRET as SECRET } from '../helpers/app';
import { MongooseMerchantRepository } from '../../src/infrastructure/persistence/mongoose-merchant.repository';
import { MerchantModel } from '../../src/infrastructure/persistence/merchant.schema';
import { InvoiceModel } from '../../src/infrastructure/persistence/invoice.schema';
import { signWebhook } from '../helpers/webhook';

const { app } = buildTestApp();

async function createPendingInvoice(amount = 10_000, feeBps = 250) {
  const merchant = await MerchantModel.create({ name: 'Acme', feeBps });
  const invoice = await request(app)
    .post('/invoice')
    .send({ amount, currency: 'USD', merchantId: merchant.id })
    .expect(201);
  return { merchant, invoiceId: invoice.body.invoiceId as string };
}

async function balanceOf(merchantId: string): Promise<number> {
  const m = await MerchantModel.findById(merchantId).lean();
  return m?.balance ?? -1;
}

describe('POST /webhook — подпись и replay', () => {
  it('принимает корректно подписанный paid и зачисляет средства один раз', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();
    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });

    const res = await request(app)
      .post('/webhook')
      .set(signed.headers)
      .send(signed.body)
      .expect(200);

    expect(res.body.applied).toBe(true);
    expect(res.body.invoice.status).toBe('paid');
    expect(await balanceOf(merchant.id)).toBe(9_750);
  });

  it('отклоняет неверную подпись (401), счёт остаётся pending', async () => {
    const { invoiceId } = await createPendingInvoice();
    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: 'wrong' });

    await request(app).post('/webhook').set(signed.headers).send(signed.body).expect(401);

    const invoice = await InvoiceModel.findById(invoiceId).lean();
    expect(invoice?.status).toBe('pending');
  });

  it('отклоняет протухший timestamp (401)', async () => {
    const { invoiceId } = await createPendingInvoice();
    const stale = Math.floor(Date.now() / 1000) - 10_000;
    const signed = signWebhook({
      payload: { invoiceId, status: 'paid' },
      secret: SECRET,
      timestamp: stale,
    });

    await request(app).post('/webhook').set(signed.headers).send(signed.body).expect(401);
  });

  it('отклоняет повтор того же nonce (409 REPLAY_DETECTED)', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();
    const signed = signWebhook({
      payload: { invoiceId, status: 'paid' },
      secret: SECRET,
      nonce: 'fixed-nonce',
    });

    await request(app).post('/webhook').set(signed.headers).send(signed.body).expect(200);
    const replay = await request(app)
      .post('/webhook')
      .set(signed.headers)
      .send(signed.body)
      .expect(409);

    expect(replay.body.error.code).toBe('REPLAY_DETECTED');
    expect(await balanceOf(merchant.id)).toBe(9_750);
  });
});

describe('POST /webhook — идемпотентность зачисления', () => {
  it('повторная доставка с новым nonce не зачисляет повторно', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();

    const first = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
    await request(app).post('/webhook').set(first.headers).send(first.body).expect(200);

    const second = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
    const res = await request(app)
      .post('/webhook')
      .set(second.headers)
      .send(second.body)
      .expect(200);

    expect(res.body.applied).toBe(false);
    expect(res.body.invoice.status).toBe('paid');
    expect(await balanceOf(merchant.id)).toBe(9_750);
  });

  it('конкурентная доставка: зачисление происходит ровно один раз', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();

    const requests = Array.from({ length: 10 }).map(() => {
      const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
      return request(app).post('/webhook').set(signed.headers).send(signed.body);
    });

    const results = await Promise.all(requests);
    const appliedCount = results.filter((r) => r.body.applied === true).length;

    expect(appliedCount).toBe(1);
    expect(await balanceOf(merchant.id)).toBe(9_750);
  });
});

describe('POST /webhook — failed', () => {
  it('переводит счёт в failed и не зачисляет средства', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();
    const signed = signWebhook({ payload: { invoiceId, status: 'failed' }, secret: SECRET });

    const res = await request(app)
      .post('/webhook')
      .set(signed.headers)
      .send(signed.body)
      .expect(200);

    expect(res.body.invoice.status).toBe('failed');
    expect(await balanceOf(merchant.id)).toBe(0);
  });

  it('failed финален: последующий paid не применяется и не зачисляет', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();

    const failed = signWebhook({ payload: { invoiceId, status: 'failed' }, secret: SECRET });
    await request(app).post('/webhook').set(failed.headers).send(failed.body).expect(200);

    const paid = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
    const res = await request(app)
      .post('/webhook')
      .set(paid.headers)
      .send(paid.body)
      .expect(200);

    expect(res.body.applied).toBe(false);
    expect(res.body.invoice.status).toBe('failed');
    expect(await balanceOf(merchant.id)).toBe(0);
  });
});

describe('POST /webhook — валидация и ошибки', () => {
  it('возвращает 400 при отсутствии обязательного заголовка', async () => {
    const { invoiceId } = await createPendingInvoice();
    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
    const headersWithoutSignature = { ...signed.headers };
    delete headersWithoutSignature['X-Signature'];

    await request(app)
      .post('/webhook')
      .set(headersWithoutSignature)
      .send(signed.body)
      .expect(400);
  });

  it('возвращает 401 при подмене тела (подпись не сходится)', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();
    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });

    await request(app)
      .post('/webhook')
      .set(signed.headers)
      .send({ invoiceId, status: 'failed' })
      .expect(401);

    const invoice = await InvoiceModel.findById(invoiceId).lean();
    expect(invoice?.status).toBe('pending');
    expect(await balanceOf(merchant.id)).toBe(0);
  });

  it('возвращает 404 для подписанного webhook на несуществующий счёт', async () => {
    const invoiceId = '64b7f0e2c2a4f3a1b2c3d4e5';
    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });

    await request(app).post('/webhook').set(signed.headers).send(signed.body).expect(404);
  });
});

describe('GET /invoice/:id после webhook', () => {
  it('отражает статус paid и settledAt после оплаты', async () => {
    const { invoiceId } = await createPendingInvoice();
    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
    await request(app).post('/webhook').set(signed.headers).send(signed.body).expect(200);

    const res = await request(app).get(`/invoice/${invoiceId}`).expect(200);
    expect(res.body.status).toBe('paid');
    expect(res.body.settledAt).not.toBeNull();
  });
});

describe('POST /webhook — атомарность транзакции', () => {
  it('при сбое зачисления откатывает смену статуса (счёт остаётся pending)', async () => {
    const { merchant, invoiceId } = await createPendingInvoice();

    const spy = jest
      .spyOn(MongooseMerchantRepository.prototype, 'applyCredit')
      .mockRejectedValue(new Error('simulated db failure'));

    const signed = signWebhook({ payload: { invoiceId, status: 'paid' }, secret: SECRET });
    await request(app).post('/webhook').set(signed.headers).send(signed.body).expect(500);

    spy.mockRestore();

    const invoice = await InvoiceModel.findById(invoiceId).lean();
    expect(invoice?.status).toBe('pending');
    expect(invoice?.settledAt).toBeNull();
    expect(await balanceOf(merchant.id)).toBe(0);
  });
});
