import { ClientSession, Types } from 'mongoose';
import { Invoice } from '../../domain/invoice/invoice';
import { InvoiceRepository } from '../../domain/invoice/invoice.repository';
import { InvoiceModel } from './invoice.schema';
import { toDomain, toPersistence, InvoiceRecord } from './invoice.mapper';

/**
 * Mongoose-реализация порта InvoiceRepository. Может быть привязана к сессии
 * (для работы внутри транзакции Unit of Work).
 */
export class MongooseInvoiceRepository implements InvoiceRepository {
  constructor(private readonly session?: ClientSession) {}

  async findById(id: string): Promise<Invoice | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const record = await InvoiceModel.findById(id)
      .session(this.session ?? null)
      .lean<InvoiceRecord | null>();
    return record ? toDomain(record) : null;
  }

  async insert(invoice: Invoice): Promise<void> {
    await InvoiceModel.create([toPersistence(invoice)], { session: this.session ?? undefined });
  }

  async update(invoice: Invoice): Promise<boolean> {
    const res = await InvoiceModel.updateOne(
      { _id: invoice.id, version: invoice.version },
      {
        $set: { status: invoice.status, settledAt: invoice.settledAt },
        $inc: { version: 1 },
      },
      { session: this.session ?? undefined },
    );
    return res.matchedCount === 1;
  }
}
