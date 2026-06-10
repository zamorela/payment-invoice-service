import { z } from 'zod';
import { Types } from 'mongoose';

const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid ObjectId' });

/**
 * Тело POST /invoice.
 * amount — в минорных единицах (целое > 0), см. utils/money.
 * Верхняя граница = Number.MAX_SAFE_INTEGER: за её пределами целые числа
 * перестают точно представляться в double (BSON Number), что недопустимо
 * для денег. Суммы крупнее обрабатываются как ошибка валидации.
 * currency — ISO-4217 (3 буквы), нормализуем к верхнему регистру.
 */
export const createInvoiceSchema = z.object({
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO-4217 code'),
  merchantId: objectId,
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const invoiceIdParamSchema = z.object({
  id: objectId,
});
