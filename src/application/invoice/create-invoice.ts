import { Money } from '../../domain/shared/money';
import { Currency } from '../../domain/shared/currency';
import { Invoice } from '../../domain/invoice/invoice';
import { InvoiceRepository } from '../../domain/invoice/invoice.repository';
import { MerchantRepository } from '../../domain/merchant/merchant.repository';
import { IdGenerator } from '../ports/id-generator';
import { MerchantNotFoundError } from '../errors';

export interface CreateInvoiceCommand {
  amountMinor: number;
  currency: string;
  merchantId: string;
}

export class CreateInvoice {
  constructor(
    private readonly merchants: MerchantRepository,
    private readonly invoices: InvoiceRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<Invoice> {
    const merchant = await this.merchants.findById(command.merchantId);
    if (!merchant) {
      throw new MerchantNotFoundError(command.merchantId);
    }

    const amount = Money.of(command.amountMinor, Currency.of(command.currency));
    const invoice = Invoice.create({
      id: this.idGenerator.generate(),
      merchantId: merchant.id,
      amount,
      feePolicy: merchant.feePolicy,
    });

    await this.invoices.insert(invoice);
    return invoice;
  }
}
