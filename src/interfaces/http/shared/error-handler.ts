import { Request, Response, NextFunction } from 'express';
import { HttpError } from './errors';
import { ApplicationError, MerchantNotFoundError, InvoiceNotFoundError } from '../../../application/errors';
import { DomainError, InvalidStatusTransitionError } from '../../../domain/shared/domain-error';

/**
 * Единый обработчик ошибок. Здесь и только здесь происходит маппинг доменных
 * и прикладных ошибок в HTTP-статусы — сам домен про HTTP не знает.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details ?? null },
    });
    return;
  }

  if (err instanceof MerchantNotFoundError || err instanceof InvoiceNotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    return;
  }

  if (err instanceof InvalidStatusTransitionError) {
    res.status(409).json({ error: { code: 'INVALID_STATE', message: err.message } });
    return;
  }

  if (err instanceof DomainError || err instanceof ApplicationError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    return;
  }

  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
  }

  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
