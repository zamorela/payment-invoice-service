import { Currency } from './currency';
import { InvalidMoneyError } from './domain-error';

/**
 * Value object денег. Сумма хранится как ЦЕЛОЕ число в минорных единицах
 * (копейки/центы) — это исключает ошибки округления float. Операции возможны
 * только над одинаковой валютой. Объект иммутабельный.
 */
export class Money {
  private constructor(
    public readonly amountMinor: number,
    public readonly currency: Currency,
  ) {}

  static of(amountMinor: number, currency: Currency): Money {
    if (
      !Number.isInteger(amountMinor) ||
      amountMinor < 0 ||
      amountMinor > Number.MAX_SAFE_INTEGER
    ) {
      throw new InvalidMoneyError(
        `amount must be a non-negative safe integer (minor units), got ${amountMinor}`,
      );
    }
    return new Money(amountMinor, currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amountMinor - other.amountMinor, this.currency);
  }

  isPositive(): boolean {
    return this.amountMinor > 0;
  }

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currency.equals(other.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new InvalidMoneyError(
        `currency mismatch: ${this.currency.code} vs ${other.currency.code}`,
      );
    }
  }
}
