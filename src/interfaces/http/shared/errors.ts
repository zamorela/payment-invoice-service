/**
 * Транспортные (HTTP) ошибки interface-слоя. В отличие от доменных и
 * прикладных ошибок, несут HTTP-статус и стабильный код для клиента.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, code, message);
  }
}
