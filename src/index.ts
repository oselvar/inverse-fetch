import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { type SafeParseReturnType, ZodType } from 'zod';
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
  constructor(message: string, public readonly type: ObjectType, public readonly status: number) {
    super(message);
  }
}

export class Validator {
  // public readonly Response: typeof Response;

  constructor(private routeConfig: RouteConfig) {
    // this.Response = makeResponse(routeConfig);
  }

  params<T extends TypedParams>(params: StringParams): T {
    const schema = this.routeConfig.request?.params;
    return validateObject<T>(schema as unknown as ZodType<T>, params, 'params', 404);
  }

  query<T extends TypedParams>(request: Request): T {
    const schema = this.routeConfig.request?.query;
    const url = new URL(request.url, 'http://dummy.com');
    const query = Object.fromEntries(url.searchParams.entries());
    return validateObject<T>(schema as unknown as ZodType<T>, query, 'query', 404);
  }

  async body<T>(request: Request): Promise<T> {
    const contentType = request.headers.get('content-type');
    if (!contentType) {
      return null as T;
    }
    if (contentType === 'application/json') {
      const contentObject = this.routeConfig.request?.body?.content;
      if (!contentObject) {
        throw new ValidationError('No content object', 'requestBody', 500);
      }
      const schema = contentObject[contentType].schema;
      const body = await request.json();
      return validateObject<T>(schema as ZodType<T>, body, `requestBody`, 422);
    }
    throw new ValidationError(`Unsupported content type: ${contentType}`, 'requestBody', 415);
  }

  async validate(response: Response): Promise<Response> {
    const copy = response.clone();

    const status = copy.status;

    const responseConfig = this.routeConfig.responses[status];
    if (!responseConfig) {
      return new Response(`No response config for status ${status}`, { status: 500 });
    }
    if (!responseConfig.content) {
      return new Response(`No response config content for status ${status}`, { status: 500 });
    }

    const contentType = copy.headers.get('content-type');
    if (contentType === 'application/json') {
      const schema = responseConfig.content[contentType].schema;
      try {
        const data = await copy.json();
        validateObject(schema as ZodType<unknown>, data, 'responseBody', 500);
      } catch (error) {
        if (error instanceof Error) {
          const status = error instanceof ValidationError ? error.status : 500;
          return new Response(error.message, { status });
        } else {
          return new Response('Unknown error', { status: 500 });
        }
      }
    } else {
      return new Response(`Invalid content-type: ${contentType}`, { status: 500 });
    }
    return response;
  }
}

function validateObject<T>(
  schema: ZodType<T>,
  value: unknown,
  type: ObjectType,
  errorStatus: number,
): T {
  if (schema === undefined) {
    throw new ValidationError(`No ${type} schema`, 'params', 500);
  }
  const result = schema.safeParse(value) as SafeParseReturnType<unknown, T>;
  if (result.success) {
    return result.data;
  }
  const valueJson = JSON.stringify(value, null, 2);
  const schemaJson = JSON.stringify(zodToJsonSchema(schema), null, 2);
  const errorMessage = `Error validating ${type}: ${valueJson}\n\nSchema: ${schemaJson}`;
  throw new ValidationError(errorMessage, type, errorStatus);
}
