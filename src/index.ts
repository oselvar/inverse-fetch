export type FetchHandler = typeof fetch;

export class HttpError extends Error {
  public readonly response: Response;

  constructor(message: string, status: number) {
    super(message);
    this.response = errorResponse(message, status);
  }
}

export class HttpError404 extends HttpError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class HttpError415 extends HttpError {
  constructor(message: string) {
    super(message, 415);
  }
}

export class HttpError422 extends HttpError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class HttpError500 extends HttpError {
  constructor(message: string) {
    super(message, 500);
  }
}

/**
 * Creates a Response with a { message } response body.
 * @param message the error message
 * @param status the HTTP status code
 * @returns a Response
 */
export function errorResponse(message: string, status: number): Response {
  return Response.json({ message }, { status });
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  } else if (error instanceof Error) {
    const httpError = new HttpError500(error.message);
    httpError.cause = error;
    return httpError;
  } else {
    return new HttpError500('Unknown error');
  }
}
