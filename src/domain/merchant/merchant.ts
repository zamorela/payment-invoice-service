import { FeePolicy } from '../invoice/fee-policy';
import { Money } from '../shared/money';
import { InvalidMoneyError } from '../shared/domain-error';

export interface MerchantProps {
  id: string;
  name: string;
  feePolicy: FeePolicy;
  balanceMinor: number;
}

/**
 * Мерчант. Несёт политику комиссии и баланс. Зачисление — через метод credit(),
 * который проверяет инварианты; персистентность — через репозиторий ($inc).
 */
export class Merchant {
  private constructor(private readonly props: MerchantProps) {}

  static create(params: {
    id: string;
    name: string;
    feePolicy: FeePolicy;
  }): Merchant {
    return new Merchant({
      id: params.id,
      name: params.name.trim(),
      feePolicy: params.feePolicy,
      balanceMinor: 0,
    });
  }

  static restore(props: MerchantProps): Merchant {
    if (props.balanceMinor < 0) {
      throw new InvalidMoneyError('merchant balance cannot be negative');
    }
    return new Merchant(props);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get feePolicy(): FeePolicy {
    return this.props.feePolicy;
  }
  get balanceMinor(): number {
    return this.props.balanceMinor;
  }

  /** Зачисляет сумму на баланс (в памяти; в БД — атомарный $inc через репозиторий). */
  credit(amount: Money): void {
    if (!amount.isPositive()) {
      throw new InvalidMoneyError('credit amount must be positive');
    }
    this.props.balanceMinor += amount.amountMinor;
  }
}
