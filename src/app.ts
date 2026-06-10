import express, { Application, Request } from 'express';
import helmet from 'helmet';
import { invoiceRouter } from './invoice/invoice.routes';
import { webhookRouter } from './webhook/webhook.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

export function createApp(): Application {
  const app = express();

  // Безопасные HTTP-заголовки по умолчанию.
  app.use(helmet());

  // Сохраняем сырое тело для проверки HMAC-подписи webhook.
  // Лимит размера тела ограничивает поверхность для DoS большими payload.
  app.use(
    express.json({
      limit: '16kb',
      verify: (req: Request, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(invoiceRouter);
  app.use(webhookRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
