export type FetchHandler = typeof fetch;

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

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

export type Input = RequestInfo | URL;

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface IRequestHelper {
  readonly request: Request;
  readonly url: URL;
  params<T extends Record<string, string>>(): T;
  query<T extends Record<string, string>>(): T;
  bodyObject<T extends Json>(): Promise<T>;
}

export class RequestHelper implements IRequestHelper {
  public readonly request: Request;
  public readonly url: URL;

  constructor(
    private readonly pathPattern: string,
    input: Input,
  ) {
    if (typeof input === 'string') {
      this.request = new Request(input);
    } else if (input instanceof URL) {
      this.request = new Request(input);
    } else if (input instanceof Request) {
      this.request = input;
    } else {
      throw new Error(`Invalid input: ${input}`);
    }
    this.url = new URL(this.request.url);
  }

  params<T extends Record<string, string>>(): T {
    return extractParams(this.pathPattern, this.url.pathname) as T;
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
}

/**
 * Creates a Response with a { message } response body.
 * @param message the error message
 * @param status the HTTP status code
 * @returns a Response
 */
export const toJsonEerrorResponse: ToErrorResponse = (error) => {
  const { message, status } = error;
  return Response.json({ message }, { status });
};

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

// TODO: Remove export
export function extractParams(pathPattern: string, path: string): Record<string, string> {
  const paramRegex = /{([^}]*)}/g;
  const paramNames = [...pathPattern.matchAll(paramRegex)].map((match) => match[1]);
  const pathRegex = new RegExp(pathPattern.replace(paramRegex, '([^/]*)'), 'g');
  const values = [...path.matchAll(pathRegex)].map((match) => match[1]);
  return Object.fromEntries(paramNames.map((name, index) => [name, values[index]]));
}
