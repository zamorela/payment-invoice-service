export const INVOICE_STATUSES = ['pending', 'paid', 'failed'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
