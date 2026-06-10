import { Money } from '../shared/money';
import { InvalidFeePolicyError } from '../shared/domain-error';

const BPS_DENOMINATOR = 10_000n; // 100% = 10000 базисных пунктов

/**
 * Value object политики комиссии. Комиссия задаётся в БАЗИСНЫХ ПУНКТАХ (bps):
 * 1 bps = 0.01%, т.е. 2.5% = 250 bps. Расчёт комиссии — целочисленный
 * (BigInt) с округлением «половина вверх», без float.
 */
export class FeePolicy {
  private constructor(public readonly basisPoints: number) {}

  static ofBasisPoints(bps: number): FeePolicy {
    if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
      throw new InvalidFeePolicyError(`feeBps must be an integer in [0, 10000], got ${bps}`);
    }
    return new FeePolicy(bps);
  }

  /** fee = round_half_up(amount * bps / 10000). */
  computeFee(amount: Money): Money {
    const numerator = BigInt(amount.amountMinor) * BigInt(this.basisPoints);
    const fee = (numerator * 2n + BPS_DENOMINATOR) / (BPS_DENOMINATOR * 2n);
    return Money.of(Number(fee), amount.currency);
  }
}
