import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { postInvoice, getInvoice } from './invoice.controller';

export const invoiceRouter = Router();

invoiceRouter.post('/invoice', asyncHandler(postInvoice));
invoiceRouter.get('/invoice/:id', asyncHandler(getInvoice));
