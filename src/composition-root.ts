import { CreateInvoice } from './application/invoice/create-invoice';
import { GetInvoice } from './application/invoice/get-invoice';
import { CreateMerchant } from './application/merchant/create-merchant';
import { ProcessWebhook } from './application/webhook/process-webhook';
import { ApplicationServices } from './application/app-services';
import { MongooseInvoiceRepository } from './infrastructure/persistence/mongoose-invoice.repository';
import { MongooseMerchantRepository } from './infrastructure/persistence/mongoose-merchant.repository';
import { MongooseUnitOfWork } from './infrastructure/persistence/mongoose-unit-of-work';
import { MongoIdGenerator } from './infrastructure/persistence/mongo-id-generator';

/**
 * Composition Root: связывает use cases с infrastructure-адаптерами.
 * Не знает про HTTP — wiring middleware делается в server.ts / тестах.
 */
export function buildApplicationServices(): ApplicationServices {
  const idGenerator = new MongoIdGenerator();
  const invoiceRepository = new MongooseInvoiceRepository();
  const merchantRepository = new MongooseMerchantRepository();
  const unitOfWork = new MongooseUnitOfWork();

  return {
    createInvoice: new CreateInvoice(merchantRepository, invoiceRepository, idGenerator),
    getInvoice: new GetInvoice(invoiceRepository),
    createMerchant: new CreateMerchant(merchantRepository, idGenerator),
    processWebhook: new ProcessWebhook(unitOfWork),
  };
}
