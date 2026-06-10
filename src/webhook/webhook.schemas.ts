import { z } from 'zod';
import { Types } from 'mongoose';

/** Статусы, которые присылает платёжная система. */
export const WEBHOOK_STATUSES = ['paid', 'failed'] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export const webhookBodySchema = z.object({
  invoiceId: z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid invoiceId' }),
  status: z.enum(WEBHOOK_STATUSES),
});

export type WebhookBody = z.infer<typeof webhookBodySchema>;

export const webhookHeadersSchema = z.object({
  'x-signature': z.string().min(1, 'X-Signature header is required'),
  'x-timestamp': z.string().min(1, 'X-Timestamp header is required'),
  'x-nonce': z.string().min(1, 'X-Nonce header is required'),
});
