import { Merchant } from './merchant';
import { Money } from '../shared/money';

export interface MerchantRepository {
  findById(id: string): Promise<Merchant | null>;

  insert(merchant: Merchant): Promise<void>;

  /** Атомарно пополняет баланс ($inc). amount уже провалидирован в домене. */
  applyCredit(merchantId: string, amount: Money): Promise<void>;
}
