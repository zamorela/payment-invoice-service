import { Request, Response } from 'express';
import { createInvoiceSchema, invoiceIdParamSchema } from './invoice.schemas';
import { createInvoice, getInvoiceById } from './invoice.service';
import { presentInvoice } from './invoice.presenter';
import { ValidationError } from '../utils/errors';

export async function postInvoice(req: Request, res: Response): Promise<void> {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid invoice payload', parsed.error.flatten());
  }

  const invoice = await createInvoice(parsed.data);
  res.status(201).json(presentInvoice(invoice));
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const parsed = invoiceIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError('Invalid invoice id', parsed.error.flatten());
  }

  const invoice = await getInvoiceById(parsed.data.id);
  res.status(200).json(presentInvoice(invoice));
}
