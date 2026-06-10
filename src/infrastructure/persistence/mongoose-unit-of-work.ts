import mongoose from 'mongoose';
import { UnitOfWork, TransactionalRepositories } from '../../application/ports/unit-of-work';
import { MongooseInvoiceRepository } from './mongoose-invoice.repository';
import { MongooseMerchantRepository } from './mongoose-merchant.repository';

/**
 * Mongoose-реализация Unit of Work. Открывает сессию, запускает работу в
 * транзакции и отдаёт репозитории, привязанные к этой сессии. session.withTransaction
 * сам ретраит коллбэк при transient-конфликтах (включая WriteConflict от
 * оптимистичной блокировки) — это и обеспечивает корректную конкуренцию.
 */
export class MongooseUnitOfWork implements UnitOfWork {
  async withTransaction<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        const repos: TransactionalRepositories = {
          invoices: new MongooseInvoiceRepository(session),
          merchants: new MongooseMerchantRepository(session),
        };
        result = await work(repos);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }
}
