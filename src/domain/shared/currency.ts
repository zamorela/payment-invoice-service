import { InvalidCurrencyError } from './domain-error';

/**
 * Value object валюты. Хранит нормализованный 3-буквенный ISO-4217 код.
 * Сравнивается по значению (equals), а не по ссылке.
 */
export class Currency {
  private constructor(public readonly code: string) {}

  static of(raw: string): Currency {
    const code = raw.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new InvalidCurrencyError(`currency must be a 3-letter ISO-4217 code, got "${raw}"`);
    }
    return new Currency(code);
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
