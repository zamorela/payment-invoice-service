import { FeePolicy } from '../../domain/invoice/fee-policy';
import { Merchant } from '../../domain/merchant/merchant';
import { MerchantRepository } from '../../domain/merchant/merchant.repository';
import { IdGenerator } from '../ports/id-generator';

export interface CreateMerchantCommand {
  name: string;
  feeBps: number;
}

export class CreateMerchant {
  constructor(
    private readonly merchants: MerchantRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateMerchantCommand): Promise<Merchant> {
    const merchant = Merchant.create({
      id: this.idGenerator.generate(),
      name: command.name,
      feePolicy: FeePolicy.ofBasisPoints(command.feeBps),
    });
    await this.merchants.insert(merchant);
    return merchant;
  }
}
