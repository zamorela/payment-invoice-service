import { Application, Request } from 'express';
import express from 'express';
import helmet from 'helmet';
import { ApplicationServices } from '../../application/app-services';
import { AsyncRequestHandler } from './shared/async-handler';
import { makeInvoiceRouter } from './invoice/invoice.routes';
import { makeWebhookRouter } from './webhook/webhook.routes';
import { errorHandler, notFoundHandler } from './shared/error-handler';

export interface HttpAppDependencies extends ApplicationServices {
  webhookAuth: AsyncRequestHandler;
}

export function createApp(deps: HttpAppDependencies): Application {
  const app = express();

  app.use(helmet());

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

  app.use(makeInvoiceRouter(deps));
  app.use(makeWebhookRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
