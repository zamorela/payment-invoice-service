import { Router } from 'express';
import { ProcessWebhook } from '../../../application/webhook/process-webhook';
import { asyncHandler, AsyncRequestHandler } from '../shared/async-handler';
import { makePostWebhook } from './webhook.controller';

export function makeWebhookRouter(deps: {
  webhookAuth: AsyncRequestHandler;
  processWebhook: ProcessWebhook;
}): Router {
  const router = Router();
  router.post('/webhook', asyncHandler(deps.webhookAuth), asyncHandler(makePostWebhook(deps.processWebhook)));
  return router;
}
