import { InvoiceRepository } from '../../domain/invoice/invoice.repository';
import { MerchantRepository } from '../../domain/merchant/merchant.repository';

/** Набор репозиториев, привязанных к одной транзакции. */
export interface TransactionalRepositories {
  invoices: InvoiceRepository;
  merchants: MerchantRepository;
}

/**
 * Порт «Единица работы». Выполняет переданную функцию в рамках одной
 * транзакции хранилища и предоставляет в неё транзакционные репозитории.
 * Use case не знает, что под капотом MongoDB-сессия — это деталь infrastructure.
 */
export interface UnitOfWork {
  withTransaction<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T>;
}
