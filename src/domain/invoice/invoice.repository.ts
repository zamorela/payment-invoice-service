import { Invoice } from './invoice';

/**
 * Порт репозитория счетов. Домен/приложение зависят только от этого интерфейса,
 * конкретная реализация (Mongoose) живёт в infrastructure.
 */
export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;

  insert(invoice: Invoice): Promise<void>;

  /**
   * Сохраняет переход статуса с ОПТИМИСТИЧНОЙ БЛОКИРОВКОЙ по version.
   * @returns true — запись обновлена этим вызовом; false — version уже изменилась.
   */
  update(invoice: Invoice): Promise<boolean>;
}
