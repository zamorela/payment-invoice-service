import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

/**
 * Мерчант. Комиссия хранится в базисных пунктах (feeBps), см. utils/money.
 * balance — накопленная сумма к зачислению (минорные единицы), пополняется
 * ровно один раз на каждый оплаченный счёт.
 */
const merchantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    feeBps: { type: Number, required: true, min: 0, max: 10_000 },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type Merchant = InferSchemaType<typeof merchantSchema>;
export type MerchantDoc = HydratedDocument<Merchant>;

export const MerchantModel = model('Merchant', merchantSchema);
