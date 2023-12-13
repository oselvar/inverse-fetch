import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import { type SafeParseReturnType, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  HttpError,
  HttpError404,
  HttpError415,
  HttpError422,
  HttpError500,
  toHttpError,
} from '../index.js';

type Input = RequestInfo | URL;
type ObjectType = 'params' | 'query' | 'requestBody' | 'responseBody';

export const ErrorSchema = z.object({
  message: z.string(),
});

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

  params<T>(input: Input): T {
    const schema = this.routeConfig.request?.params;

    const pathPattern = this.routeConfig.path;
    const path = toUrl(input).pathname;
    const params = extractParams(pathPattern, path);

    return this.validateObject<T>(schema as unknown as ZodType<T>, params, 'params', HttpError404);
  }

  query<T>(input: Input): T {
    const schema = this.routeConfig.request?.query;
    const url = toUrl(input);
    const query = Object.fromEntries(url.searchParams.entries());
    return this.validateObject<T>(schema as unknown as ZodType<T>, query, 'query', HttpError404);
  }

  async body<T>(input: Input): Promise<T> {
    const request = toRequest(input);

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
      throw new HttpError500(
        `No response config for status ${status}. Allowed statuses: ${statuses}`,
      );
    }

    const contentType = copy.headers.get('content-type');
    if (contentType === 'application/json') {
      if (!responseConfig.content) {
        throw new HttpError500(`No response config content for status ${status}`);
      }
      const schema = responseConfig.content[contentType].schema;
      try {
        const data = await copy.json();
        this.validateObject(schema as ZodType<unknown>, data, 'responseBody', HttpError500);
      } catch (error) {
        throw toHttpError(error);
      }
    }
    return response;
  }

  private validateObject<T>(
    schema: ZodType<T> | undefined,
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

function toRequest(input: Input): Request {
  if (typeof input === 'string') {
    return new Request(input);
  } else if (input instanceof URL) {
    return new Request(input);
  } else if (input instanceof Request) {
    return input;
  }
  throw new Error(`Invalid input: ${input}`);
}

function toUrl(input: Input): URL {
  if (typeof input === 'string') {
    return new URL(input);
  } else if (input instanceof URL) {
    return input;
  } else if (input instanceof Request) {
    return new URL(input.url);
  }
  throw new Error(`Invalid input: ${input}`);
}

function extractParams(pathPattern: string, path: string): Record<string, string> {
  const paramRegex = /{([^}]*)}/g;
  const paramNames = [...pathPattern.matchAll(paramRegex)].map((match) => match[1]);
  const pathRegex = new RegExp(pathPattern.replace(paramRegex, '([^/]*)'), 'g');
  const values = [...path.matchAll(pathRegex)].map((match) => match[1]);
  return Object.fromEntries(paramNames.map((name, index) => [name, values[index]]));
}
