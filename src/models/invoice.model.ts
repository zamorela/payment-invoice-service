import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

export const INVOICE_STATUSES = ['pending', 'paid', 'failed'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * Счёт на оплату.
 *
 * Денежные поля (amount, fee, amountToReceive) — целые минорные единицы.
 * status управляется только через атомарные переходы (см. invoice.service),
 * что гарантирует зачисление средств ровно один раз.
 */
const invoiceSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
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
    // Момент финализации (перехода из pending в paid/failed).
    settledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Invoice = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDoc = HydratedDocument<Invoice>;
export type InvoiceId = Types.ObjectId;

export const InvoiceModel = model('Invoice', invoiceSchema);
