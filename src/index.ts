import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import { type SafeParseReturnType, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type FetchRouteContext<Params extends StringParams> = {
  params: Params;
  request: Request;
};

export type FetchWithParams<Params extends StringParams = StringParams> = (
  input: RequestInfo | URL,
  init?: RequestInitWithParams<Params>,
) => Promise<Response>;

export type RequestInitWithParams<Params extends StringParams = StringParams> = RequestInit & {
  params?: Params;
};

export type FetchHandler<Params extends StringParams = StringParams> = (
  context: FetchRouteContext<Params>,
) => Promise<Response>;

export type StringParams = Record<string, string | undefined>;

export type TypedParams = Record<string, string | number | undefined>;

type ObjectType = 'params' | 'query' | 'requestBody' | 'responseBody';

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

export const ErrorSchema = z.object({
  message: z.string(),
});

export type UnwrappedError = {
  message: string;
  response: Response;
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

export const Response404: ResponseConfig = {
  description: 'Not Found',
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
};

export const Response415: ResponseConfig = {
  description: 'Unsupported Media Type',
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
};

export const Response422: ResponseConfig = {
  description: 'Unprocessable Entity',
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
};

export const Response500: ResponseConfig = {
  description: 'Internal Server Error',
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
};

export class Validator {
  constructor(private routeConfig: RouteConfig) {}

  params<T extends TypedParams>(params: StringParams | undefined): T {
    const schema = this.routeConfig.request?.params;
    return this.validateObject<T>(schema as unknown as ZodType<T>, params, 'params', HttpError404);
  }

  query<T extends TypedParams>(request: Request): T {
    const schema = this.routeConfig.request?.query;
    const url = new URL(request.url, 'http://dummy.com');
    const query = Object.fromEntries(url.searchParams.entries());
    return this.validateObject<T>(schema as unknown as ZodType<T>, query, 'query', HttpError404);
  }

  async body<T>(request: URL | RequestInfo): Promise<T> {
    if (typeof request === 'string') {
      throw new Error('RequestInfo must be a Request, but got a string');
    }
    if (request instanceof URL) {
      request = new Request(request);
    }
    const contentType = request.headers.get('content-type');
    if (!contentType) {
      return null as T;
    }
    const schema = this.routeConfig.request?.body?.content[contentType]?.schema;
    if (!schema) {
      throw new HttpError415(`No schema for Content-Type: ${contentType}`);
    }
    if (contentType === 'application/json') {
      const body = await request.json();
      return this.validateObject<T>(schema as ZodType<T>, body, `requestBody`, HttpError422);
    } else if (contentType === 'application/x-www-form-urlencoded') {
      const body = await request.formData();
      const data = Object.fromEntries(body.entries());
      return this.validateObject<T>(schema as ZodType<T>, data, `requestBody`, HttpError422);
    }
    throw new HttpError415(`Unsupported Content-Type: ${contentType}`);
  }

  async validate(response: Response): Promise<Response> {
    const copy = response.clone();

    const status = copy.status;

    const responseConfig = this.routeConfig.responses[status];
    if (!responseConfig) {
      const statuses = Object.keys(this.routeConfig.responses).join(', ');
      return errorResponse(
        `No response config for status ${status}. Allowed statuses: ${statuses}`,
        500,
      );
    }

    const contentType = copy.headers.get('content-type');
    if (contentType === 'application/json') {
      if (!responseConfig.content) {
        return errorResponse(`No response config content for status ${status}`, 500);
      }
      const schema = responseConfig.content[contentType].schema;
      try {
        const data = await copy.json();
        this.validateObject(schema as ZodType<unknown>, data, 'responseBody', HttpError500);
      } catch (error) {
        const { response } = toHttpError(error);
        return response;
      }
    }
    return response;
  }

  private validateObject<T>(
    schema: ZodType<T>,
    value: unknown,
    type: ObjectType,
    errorClass: new (message: string) => HttpError,
  ): T {
    if (schema === undefined) {
      throw new HttpError(`No ${type} schema`, 500);
    }
    const result = schema.safeParse(value) as SafeParseReturnType<unknown, T>;
    if (result.success) {
      return result.data;
    }
    const valueJson = JSON.stringify(value, null, 2);
    const schemaJson = JSON.stringify(zodToJsonSchema(schema), null, 2);
    const errorMessage = `Error validating ${type}: ${valueJson}\n\nSchema: ${schemaJson}`;
    throw new errorClass(errorMessage);
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
