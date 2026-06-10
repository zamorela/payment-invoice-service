import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Оборачивает async-обработчик так, чтобы любые отклонённые промисы
 * попадали в express error middleware (в Express 4 это не происходит автоматически).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
