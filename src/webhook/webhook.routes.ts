import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { verifyWebhook } from './webhook.middleware';
import { postWebhook } from './webhook.controller';

export const webhookRouter = Router();

webhookRouter.post('/webhook', asyncHandler(verifyWebhook), asyncHandler(postWebhook));
