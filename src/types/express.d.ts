import type { WebhookBody } from '../webhook/webhook.schemas';

declare global {
  namespace Express {
    interface Request {
      /** Сырое тело запроса (нужно для проверки HMAC-подписи webhook). */
      rawBody?: string;
      /** Провалидированное тело webhook, проброшенное из middleware в контроллер. */
      webhookBody?: WebhookBody;
    }
  }
}

export {};
