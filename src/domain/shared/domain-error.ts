/**
 * Базовый класс доменных ошибок. Домен НЕ знает про HTTP — отображение
 * в статус-коды происходит в interface-слое (error-handler).
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidMoneyError extends DomainError {}
export class InvalidCurrencyError extends DomainError {}
export class InvalidFeePolicyError extends DomainError {}
export class InvalidStatusTransitionError extends DomainError {}
