import { Invoice } from '../../domain/invoice/invoice';
import { SettlementService } from '../../domain/invoice/settlement.service';
import { InvoiceStatus } from '../../domain/invoice/invoice-status';
import { UnitOfWork } from '../ports/unit-of-work';
import { InvoiceNotFoundError, MerchantNotFoundError } from '../errors';

export interface ProcessWebhookResult {
  invoice: Invoice;
  applied: boolean;
}

export class ProcessWebhook {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(
    invoiceId: string,
    status: Extract<InvoiceStatus, 'paid' | 'failed'>,
  ): Promise<ProcessWebhookResult> {
    return this.unitOfWork.withTransaction(async ({ invoices, merchants }) => {
      const invoice = await invoices.findById(invoiceId);
      if (!invoice) {
        throw new InvoiceNotFoundError(invoiceId);
      }

      if (!invoice.isPending()) {
        return { invoice, applied: false };
      }

      const merchant = await merchants.findById(invoice.merchantId);
      if (!merchant) {
        throw new MerchantNotFoundError(invoice.merchantId);
      }

      const { creditAmount } = SettlementService.apply(invoice, merchant, status);

      const won = await invoices.update(invoice);
      if (!won) {
        const current = await invoices.findById(invoiceId);
        return { invoice: current ?? invoice, applied: false };
      }

      if (creditAmount) {
        await merchants.applyCredit(merchant.id, creditAmount);
      }

      return { invoice, applied: true };
    });
  }
}
