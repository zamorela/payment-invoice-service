import { Types } from 'mongoose';
import { InvoiceModel, InvoiceDoc } from '../models/invoice.model';
import { MerchantModel } from '../models/merchant.model';
import { computeFee } from '../utils/money';
import { NotFoundError } from '../utils/errors';
import { CreateInvoiceInput } from './invoice.schemas';

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDoc> {
  const merchant = await MerchantModel.findById(input.merchantId).lean();
  if (!merchant) {
    throw new NotFoundError('Merchant not found');
  }

  const { fee, amountToReceive } = computeFee(input.amount, merchant.feeBps);

  const invoice = await InvoiceModel.create({
    merchantId: new Types.ObjectId(input.merchantId),
    amount: input.amount,
    currency: input.currency,
    feeBps: merchant.feeBps,
    fee,
    amountToReceive,
    status: 'pending',
  });

  return invoice;
}

export async function getInvoiceById(id: string): Promise<InvoiceDoc> {
  const invoice = await InvoiceModel.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }
  return invoice;
}
