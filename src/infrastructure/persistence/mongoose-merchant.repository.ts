import { ClientSession, Types } from 'mongoose';
import { Merchant } from '../../domain/merchant/merchant';
import { MerchantRepository } from '../../domain/merchant/merchant.repository';
import { FeePolicy } from '../../domain/invoice/fee-policy';
import { Money } from '../../domain/shared/money';
import { MerchantModel } from './merchant.schema';

export class MongooseMerchantRepository implements MerchantRepository {
  constructor(private readonly session?: ClientSession) {}

  async findById(id: string): Promise<Merchant | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const record = await MerchantModel.findById(id)
      .session(this.session ?? null)
      .lean<{ _id: Types.ObjectId; name: string; feeBps: number; balance: number } | null>();
    if (!record) {
      return null;
    }
    return Merchant.restore({
      id: record._id.toString(),
      name: record.name,
      feePolicy: FeePolicy.ofBasisPoints(record.feeBps),
      balanceMinor: record.balance,
    });
  }

  async insert(merchant: Merchant): Promise<void> {
    await MerchantModel.create(
      [
        {
          _id: new Types.ObjectId(merchant.id),
          name: merchant.name,
          feeBps: merchant.feePolicy.basisPoints,
          balance: merchant.balanceMinor,
        },
      ],
      { session: this.session ?? undefined },
    );
  }

  async applyCredit(merchantId: string, amount: Money): Promise<void> {
    await MerchantModel.updateOne(
      { _id: merchantId },
      { $inc: { balance: amount.amountMinor } },
      { session: this.session ?? undefined },
    );
  }
}
