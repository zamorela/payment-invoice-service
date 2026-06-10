/**
 * Ошибки уровня приложения (use cases). Как и доменные, не знают про HTTP —
 * маппинг в статус-коды делает interface-слой.
 */
export abstract class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class MerchantNotFoundError extends ApplicationError {
  constructor(id: string) {
    super(`Merchant ${id} not found`);
  }
}

export class InvoiceNotFoundError extends ApplicationError {
  constructor(id: string) {
    super(`Invoice ${id} not found`);
  }
}
