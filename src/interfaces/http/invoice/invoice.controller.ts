import { Request, Response } from 'express';
import { CreateInvoice } from '../../../application/invoice/create-invoice';
import { GetInvoice } from '../../../application/invoice/get-invoice';
import { createInvoiceSchema, invoiceIdParamSchema } from './invoice.dto';
import { presentInvoice } from './invoice.presenter';
import { ValidationError } from '../shared/errors';

/** Контроллеры — фабрики, получают use cases через DI (composition root). */
export function makePostInvoice(createInvoice: CreateInvoice) {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid invoice payload', parsed.error.flatten());
    }

    const invoice = await createInvoice.execute({
      amountMinor: parsed.data.amount,
      currency: parsed.data.currency,
      merchantId: parsed.data.merchantId,
    });

    res.status(201).json(presentInvoice(invoice));
  };
}

export function makeGetInvoice(getInvoice: GetInvoice) {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = invoiceIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new ValidationError('Invalid invoice id', parsed.error.flatten());
    }

    const invoice = await getInvoice.execute(parsed.data.id);
    res.status(200).json(presentInvoice(invoice));
  };
}
