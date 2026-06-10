import { Router } from 'express';
import { CreateInvoice } from '../../../application/invoice/create-invoice';
import { GetInvoice } from '../../../application/invoice/get-invoice';
import { asyncHandler } from '../shared/async-handler';
import { makePostInvoice, makeGetInvoice } from './invoice.controller';

export function makeInvoiceRouter(deps: {
  createInvoice: CreateInvoice;
  getInvoice: GetInvoice;
}): Router {
  const router = Router();
  router.post('/invoice', asyncHandler(makePostInvoice(deps.createInvoice)));
  router.get('/invoice/:id', asyncHandler(makeGetInvoice(deps.getInvoice)));
  return router;
}
