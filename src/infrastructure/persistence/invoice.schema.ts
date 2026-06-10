import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';
import { INVOICE_STATUSES } from '../../domain/invoice/invoice-status';

/**
 * Persistence-схема счёта (деталь инфраструктуры, не доменная модель).
 * Денежные поля — целые минорные единицы. `version` используется для
 * оптимистичной блокировки при финализации (встроенный __v отключён).
 */
const invoiceSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    amountToReceive: { type: Number, required: true, min: 0 },
    feeBps: { type: Number, required: true, min: 0, max: 10_000 },
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    settledAt: { type: Date, default: null },
    version: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export type InvoiceSchemaType = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDoc = HydratedDocument<InvoiceSchemaType>;

export const InvoiceModel = model('Invoice', invoiceSchema);
