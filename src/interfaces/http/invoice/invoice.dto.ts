import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, 'must be a 24-char hex id');

/**
 * DTO тела POST /invoice. amount — в минорных единицах (целое > 0), не больше
 * безопасного целого, чтобы суммы точно представлялись. currency нормализуется
 * к верхнему регистру.
 */
export const createInvoiceSchema = z.object({
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO-4217 code'),
  merchantId: objectIdString,
});

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;

export const invoiceIdParamSchema = z.object({
  id: objectIdString,
});
