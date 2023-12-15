export type FetchHandler = typeof fetch;

export const HttpMethods = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE',
] as const;
export type HttpMethod = (typeof HttpMethods)[number];

export type Input = RequestInfo | URL;

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * A Fetch API helper interface that simplifies retrieval of data from a request.
 */
export interface IFetchHelper {
  readonly request: Request;
  readonly url: URL;

  /**
   * Returns the path parameters from the request URL.
   */
  params<T extends Record<string, string>>(): T;

  /**
   * Returns the query parameters from the request URL.
   */
  query<T extends Record<string, string>>(): T;

  /**
   * Returns the request body as a JSON object.
   */
  bodyObject<T extends Json>(): Promise<T>;

  /**
   * Returns the response.
   */
  respondWith(response: Response): Promise<Response>;
}

export const paramRegExp = /{([^}]*)}/g;

export class FetchHelper implements IFetchHelper {
  public readonly request: Request;
  public readonly url: URL;

  constructor(
    private readonly pathPattern: string,
    input: Input,
    init: RequestInit | undefined,
  ) {
    if (typeof input === 'string') {
      this.request = new Request(input, init);
    } else if (input instanceof URL) {
      this.request = new Request(input, init);
    } else if (input instanceof Request) {
      this.request = input;
    } else {
      throw new Error(`Invalid input: ${input}`);
    }
    this.url = new URL(this.request.url);
  }

  params<T extends Record<string, string>>(): T {
    const pathRegExp = toPathRegExp(this.pathPattern);
    const values = [...this.url.pathname.matchAll(pathRegExp)].map((match) => match[1]);
    const paramNames = [...this.pathPattern.matchAll(paramRegExp)].map((match) => match[1]);
    return Object.fromEntries(paramNames.map((name, index) => [name, values[index]])) as T;
  }

  query<T extends Record<string, string>>(): T {
    return Object.fromEntries(this.url.searchParams.entries()) as T;
  }

  /**
   * Returns the request body as a JSON object.
   *
   * @throws HttpError415 if the request body is not `application/json` or `application/x-www-form-urlencoded`
   */
  async bodyObject<T extends Json>(): Promise<T> {
    const contentType = this.request.headers.get('content-type');
    if (!contentType) {
      throw new HttpError415(`No Content-Type header`);
    }
    if (contentType === 'application/json') {
      return this.request.json();
    } else if (contentType === 'application/x-www-form-urlencoded') {
      const body = await this.request.formData();
      return Object.fromEntries(body.entries()) as T;
    }
    throw new HttpError415(`Unsupported Content-Type: ${contentType}`);
  }

  async respondWith(response: Response): Promise<Response> {
    return response;
  }
}

/**
 * Creates a Response with a { message } response body.
 * @param message the error message
 * @param status the HTTP status code
 * @returns a Response
 */
export const toJsonErrorResponse: ToErrorResponse = (error) => {
  const { message, status } = error;
  return Response.json({ message }, { status });
};

/**
 * Creates a Fetch API handler that catches errors and converts them to a Response.
 *
 * @param handler a non-error-handling Fetch API handler
 * @param toErrorResponse optional function to convert an HttpError to a Response
 * @returns a Fetch API handler that never throws errors, always returns a Response
 */
export function errorHandler(
  handler: FetchHandler,
  // TODO: Make this required
  toErrorResponse: ToErrorResponse = toJsonErrorResponse,
): FetchHandler {
  return async (input, init) => {
    try {
      return await handler(input, init);
    } catch (error) {
      const httpError = toHttpError(error);
      return toErrorResponse(httpError);
    }
  };
}

//////// Errors

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
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

export type ToErrorResponse = (error: HttpError) => Response;

function toHttpError(error: unknown): HttpError {
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

export function toPathRegExp(pathPattern: string): RegExp {
  return new RegExp(pathPattern.replace(paramRegExp, '([^/]*)'), 'g');
}

export function toColonPathPattern(pathPattern: string): string {
  return pathPattern.replace(paramRegExp, ':$1');
}
