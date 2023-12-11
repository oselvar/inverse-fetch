import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import { type SafeParseReturnType, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type FetchRouteContext<Params extends StringParams> = {
  params: Params;
  request: Request;
};

export type FetchRoute<Params extends StringParams = StringParams> = (
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
    const httpError = new HttpError(error.message, 500);
    httpError.cause = error;
    return httpError;
  } else {
    const message = 'Unknown error';
    return new HttpError(message, 500);
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

  params<T extends TypedParams>(params: StringParams): T {
    const schema = this.routeConfig.request?.params;
    return this.validateObject<T>(schema as unknown as ZodType<T>, params, 'params', 404);
  }

  query<T extends TypedParams>(request: Request): T {
    const schema = this.routeConfig.request?.query;
    const url = new URL(request.url, 'http://dummy.com');
    const query = Object.fromEntries(url.searchParams.entries());
    return this.validateObject<T>(schema as unknown as ZodType<T>, query, 'query', 404);
  }

  async body<T>(request: Request): Promise<T> {
    const contentType = request.headers.get('content-type');
    if (!contentType) {
      return null as T;
    }
    const schema = this.routeConfig.request?.body?.content[contentType]?.schema;
    if (!schema) {
      throw new HttpError(`No schema for Content-Type: ${contentType}`, 415);
    }
    if (contentType === 'application/json') {
      const body = await request.json();
      return this.validateObject<T>(schema as ZodType<T>, body, `requestBody`, 422);
    } else if (contentType === 'application/x-www-form-urlencoded') {
      const body = await request.formData();
      const data = Object.fromEntries(body.entries());
      return this.validateObject<T>(schema as ZodType<T>, data, `requestBody`, 422);
    }
    throw new HttpError(`Unsupported Content-Type: ${contentType}`, 415);
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
        this.validateObject(schema as ZodType<unknown>, data, 'responseBody', 500);
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
    errorStatus: number,
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
    throw new HttpError(errorMessage, errorStatus);
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
