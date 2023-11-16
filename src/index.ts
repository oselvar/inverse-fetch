import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { type SafeParseReturnType, z, ZodType } from 'zod';
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

export class ValidationError extends Error {
  constructor(message: string, public readonly response: Response) {
    super(message);
  }
}

export const ErrorSchema = z.object({
  message: z.string(),
});

export function errorResponse(message: string, status: number): Response {
  return Response.json({ message }, { status });
}

export type UnwrappedError = {
  message: string;
  response: Response;
};

export function unwrapError(error: unknown): UnwrappedError {
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      response: error.response,
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
      response: errorResponse(error.message, 500),
    };
  } else {
    const message = 'Unknown error';
    return {
      message,
      response: errorResponse(message, 500),
    };
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
  // public readonly Response: typeof Response;

  constructor(private routeConfig: RouteConfig) {
    // this.Response = makeResponse(routeConfig);
  }

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
    if (contentType === 'application/json') {
      const contentObject = this.routeConfig.request?.body?.content;
      if (!contentObject) {
        throw this.makeValidationError('No content object', 500);
      }
      const schema = contentObject[contentType].schema;
      const body = await request.json();
      return this.validateObject<T>(schema as ZodType<T>, body, `requestBody`, 422);
    }
    throw this.makeValidationError(`Unsupported content type: ${contentType}`, 415);
  }

  async validate(response: Response): Promise<Response> {
    const copy = response.clone();

    const status = copy.status;

    const responseConfig = this.routeConfig.responses[status];
    if (!responseConfig) {
      return errorResponse(`No response config for status ${status}`, 500);
    }
    if (!responseConfig.content) {
      return errorResponse(`No response config content for status ${status}`, 500);
    }

    const contentType = copy.headers.get('content-type');
    if (contentType === 'application/json') {
      const schema = responseConfig.content[contentType].schema;
      try {
        const data = await copy.json();
        this.validateObject(schema as ZodType<unknown>, data, 'responseBody', 500);
      } catch (error) {
        const { response } = unwrapError(error);
        return response;
      }
    } else {
      return errorResponse(`Invalid content-type: ${contentType}`, 500);
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
      throw this.makeValidationError(`No ${type} schema`, 500);
    }
    const result = schema.safeParse(value) as SafeParseReturnType<unknown, T>;
    if (result.success) {
      return result.data;
    }
    const valueJson = JSON.stringify(value, null, 2);
    const schemaJson = JSON.stringify(zodToJsonSchema(schema), null, 2);
    const errorMessage = `Error validating ${type}: ${valueJson}\n\nSchema: ${schemaJson}`;
    throw this.makeValidationError(errorMessage, errorStatus);
  }

  private makeValidationError(message: string, status: number): ValidationError {
    return new ValidationError(message, errorResponse(message, status));
  }
}
