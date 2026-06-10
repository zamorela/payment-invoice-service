import { z } from 'zod';

export const WEBHOOK_STATUSES = ['paid', 'failed'] as const;

export const webhookBodySchema = z.object({
  invoiceId: z.string().regex(/^[a-f\d]{24}$/i, 'invoiceId must be a 24-char hex id'),
  status: z.enum(WEBHOOK_STATUSES),
});

export type WebhookBody = z.infer<typeof webhookBodySchema>;

export const webhookHeadersSchema = z.object({
  'x-signature': z.string().min(1, 'X-Signature header is required'),
  'x-timestamp': z.string().min(1, 'X-Timestamp header is required'),
  'x-nonce': z.string().min(1, 'X-Nonce header is required'),
});
