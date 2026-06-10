import { Money } from '../shared/money';
import { FeePolicy } from './fee-policy';
import { InvoiceStatus } from './invoice-status';
import { InvalidMoneyError, InvalidStatusTransitionError } from '../shared/domain-error';

export interface InvoiceProps {
  id: string;
  merchantId: string;
  amount: Money;
  feePolicy: FeePolicy;
  fee: Money;
  amountToReceive: Money;
  status: InvoiceStatus;
  settledAt: Date | null;
  createdAt: Date;
  version: number;
}

/**
 * Агрегат «Счёт». Инкапсулирует инварианты: комиссия считается при создании,
 * переход в финальный статус возможен только из pending. Денежные суммы —
 * value objects Money, что не даёт перепутать валюты или потерять точность.
 */
export class Invoice {
  private constructor(private readonly props: InvoiceProps) {}

  /** Создаёт новый счёт: считает комиссию и сумму к зачислению. */
  static create(params: {
    id: string;
    merchantId: string;
    amount: Money;
    feePolicy: FeePolicy;
    createdAt?: Date;
  }): Invoice {
    if (!params.amount.isPositive()) {
      throw new InvalidMoneyError('invoice amount must be positive');
    }
    const fee = params.feePolicy.computeFee(params.amount);
    const amountToReceive = params.amount.minus(fee);

    return new Invoice({
      id: params.id,
      merchantId: params.merchantId,
      amount: params.amount,
      feePolicy: params.feePolicy,
      fee,
      amountToReceive,
      status: 'pending',
      settledAt: null,
      createdAt: params.createdAt ?? new Date(),
      version: 0,
    });
  }

  /** Восстанавливает агрегат из хранилища с проверкой базовых инвариантов. */
  static restore(props: InvoiceProps): Invoice {
    if (props.version < 0) {
      throw new InvalidMoneyError('invoice version cannot be negative');
    }
    const expectedReceive = props.amount.minus(props.fee);
    if (!props.amountToReceive.equals(expectedReceive)) {
      throw new InvalidMoneyError('amountToReceive must equal amount - fee');
    }
    if (!props.fee.currency.equals(props.amount.currency)) {
      throw new InvalidMoneyError('fee currency must match invoice currency');
    }
    return new Invoice(props);
  }

  get id(): string {
    return this.props.id;
  }
  get merchantId(): string {
    return this.props.merchantId;
  }
  get amount(): Money {
    return this.props.amount;
  }
  get feePolicy(): FeePolicy {
    return this.props.feePolicy;
  }
  get fee(): Money {
    return this.props.fee;
  }
  get amountToReceive(): Money {
    return this.props.amountToReceive;
  }
  get status(): InvoiceStatus {
    return this.props.status;
  }
  get settledAt(): Date | null {
    return this.props.settledAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get version(): number {
    return this.props.version;
  }

  isPending(): boolean {
    return this.props.status === 'pending';
  }

  markPaid(now: Date = new Date()): void {
    this.transitionTo('paid', now);
  }

  markFailed(now: Date = new Date()): void {
    this.transitionTo('failed', now);
  }

  private transitionTo(status: InvoiceStatus, now: Date): void {
    if (this.props.status !== 'pending') {
      throw new InvalidStatusTransitionError(
        `cannot transition invoice ${this.props.id} from ${this.props.status} to ${status}`,
      );
    }
    this.props.status = status;
    this.props.settledAt = now;
  }
}
