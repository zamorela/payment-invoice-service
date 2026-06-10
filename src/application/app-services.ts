import { CreateInvoice } from './invoice/create-invoice';
import { GetInvoice } from './invoice/get-invoice';
import { CreateMerchant } from './merchant/create-merchant';
import { ProcessWebhook } from './webhook/process-webhook';

/** Use cases приложения — без HTTP-деталей. */
export interface ApplicationServices {
  createInvoice: CreateInvoice;
  getInvoice: GetInvoice;
  createMerchant: CreateMerchant;
  processWebhook: ProcessWebhook;
}
