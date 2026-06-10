import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

/**
 * Persistence-схема мерчанта. Комиссия хранится в базисных пунктах (feeBps),
 * balance — накопленная сумма к зачислению в минорных единицах.
 */
const merchantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    feeBps: { type: Number, required: true, min: 0, max: 10_000 },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

export type MerchantSchemaType = InferSchemaType<typeof merchantSchema>;
export type MerchantDoc = HydratedDocument<MerchantSchemaType>;

export const MerchantModel = model('Merchant', merchantSchema);
