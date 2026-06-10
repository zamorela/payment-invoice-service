import { Invoice } from '../../domain/invoice/invoice';
import { InvoiceRepository } from '../../domain/invoice/invoice.repository';
import { InvoiceNotFoundError } from '../errors';

export class GetInvoice {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(id: string): Promise<Invoice> {
    const invoice = await this.invoices.findById(id);
    if (!invoice) {
      throw new InvoiceNotFoundError(id);
    }
    return invoice;
  }
}
