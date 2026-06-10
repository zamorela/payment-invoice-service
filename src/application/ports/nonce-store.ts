/**
 * Порт хранилища nonce для защиты webhook от повторов (anti-replay).
 * Реализация (Redis) живёт в infrastructure.
 */
export interface NonceStore {
  /**
   * Атомарно резервирует nonce на ttlSeconds.
   * @returns true — nonce занят впервые (запрос валиден); false — повтор.
   */
  reserve(nonce: string, ttlSeconds: number): Promise<boolean>;
}
