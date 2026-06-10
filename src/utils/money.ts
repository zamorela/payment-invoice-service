/**
 * Денежная арифметика.
 *
 * Все суммы в системе хранятся и передаются в МИНОРНЫХ единицах валюты
 * (целые числа: копейки, центы). Это полностью исключает ошибки округления
 * чисел с плавающей точкой при сложении/вычитании денег.
 *
 * Комиссия мерчанта задаётся в БАЗИСНЫХ ПУНКТАХ (basis points, bps):
 *   1 bps = 0.01%, значит feePercent% = feeBps / 100.
 *   Пример: 2.5% -> 250 bps.
 * Хранение комиссии целым числом позволяет считать fee исключительно
 * в целочисленной арифметике, без float.
 */

export const BPS_DENOMINATOR = 10_000; // 100% = 10000 bps

/**
 * Деление с округлением «половина вверх» (round half up) для неотрицательных чисел.
 * Используем BigInt, чтобы не упереться в Number.MAX_SAFE_INTEGER на больших суммах.
 */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error('denominator must be positive');
  }
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export interface FeeBreakdown {
  /** Исходная сумма счёта (минорные единицы). */
  amount: number;
  /** Комиссия (минорные единицы). */
  fee: number;
  /** Сумма к зачислению мерчанту: amount - fee (минорные единицы). */
  amountToReceive: number;
}

/**
 * Рассчитывает комиссию и сумму к зачислению.
 * fee = round(amount * feeBps / 10000), amountToReceive = amount - fee.
 *
 * @param amount  сумма счёта в минорных единицах (целое, > 0)
 * @param feeBps  комиссия в базисных пунктах (целое, >= 0)
 */
export function computeFee(amount: number, feeBps: number): FeeBreakdown {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer (minor units)');
  }
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > BPS_DENOMINATOR) {
    throw new Error('feeBps must be an integer in [0, 10000]');
  }

  const fee = Number(
    divRoundHalfUp(BigInt(amount) * BigInt(feeBps), BigInt(BPS_DENOMINATOR)),
  );
  const amountToReceive = amount - fee;

  return { amount, fee, amountToReceive };
}
