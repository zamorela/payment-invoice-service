import { Types } from 'mongoose';
import { Invoice } from '../../domain/invoice/invoice';
import { FeePolicy } from '../../domain/invoice/fee-policy';
import { Money } from '../../domain/shared/money';
import { Currency } from '../../domain/shared/currency';
import { InvoiceStatus } from '../../domain/invoice/invoice-status';

/** Плоская persistence-запись счёта (результат .lean()). */
export interface InvoiceRecord {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  amount: number;
  currency: string;
  fee: number;
  amountToReceive: number;
  feeBps: number;
  status: string;
  settledAt: Date | null;
  createdAt: Date;
  version: number;
}

/** Persistence-запись -> доменный агрегат. */
export function toDomain(record: InvoiceRecord): Invoice {
  const currency = Currency.of(record.currency);
  return Invoice.restore({
    id: record._id.toString(),
    merchantId: record.merchantId.toString(),
    amount: Money.of(record.amount, currency),
    feePolicy: FeePolicy.ofBasisPoints(record.feeBps),
    fee: Money.of(record.fee, currency),
    amountToReceive: Money.of(record.amountToReceive, currency),
    status: record.status as InvoiceStatus,
    settledAt: record.settledAt ?? null,
    createdAt: record.createdAt,
    version: record.version,
  });
}

/** Доменный агрегат -> объект для вставки в Mongo. */
export function toPersistence(invoice: Invoice): Record<string, unknown> {
  return {
    _id: new Types.ObjectId(invoice.id),
    merchantId: new Types.ObjectId(invoice.merchantId),
    amount: invoice.amount.amountMinor,
    currency: invoice.amount.currency.code,
    fee: invoice.fee.amountMinor,
    amountToReceive: invoice.amountToReceive.amountMinor,
    feeBps: invoice.feePolicy.basisPoints,
    status: invoice.status,
    settledAt: invoice.settledAt,
    version: invoice.version,
  };
}
