import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import { type SafeParseReturnType, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { IFetchHelper, Input, Json } from '../index.js';
import {
  FetchHelper,
  HttpError,
  HttpError404,
  HttpError415,
  HttpError422,
  HttpError500,
  toHttpError,
} from '../index.js';

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

/**
 * Helper class for working with OpenAPI routes.
 *
 * This class is a wrapper around FetchHelper that provides additional functionality
 * for validating OpenAPI requests and responses against a schema.
 */
export class OpenAPIHelper implements IFetchHelper {
  private readonly helper: IFetchHelper;
  public readonly request: Request;
  public readonly url: URL;

  constructor(
    private readonly routeConfig: RouteConfig,
    input: Input,
  ) {
    this.helper = new FetchHelper(routeConfig.path, input);
    this.request = this.helper.request;
    this.url = this.helper.url;
  }

  params<T extends Record<string, string>>(): T {
    const params = this.helper.params();
    const schema = this.routeConfig.request?.params;
    return this.validateObject<T>(schema as unknown as ZodType<T>, params, 'params', HttpError404);
  }

  query<T extends Record<string, string>>(): T {
    const query = this.helper.query();
    const schema = this.routeConfig.request?.query;
    return this.validateObject<T>(schema as unknown as ZodType<T>, query, 'query', HttpError404);
  }

  async bodyObject<T extends Json>(): Promise<T> {
    const body = await this.helper.bodyObject();
    if (!body) {
      return body as T;
    }
    const contentType = this.helper.request.headers.get('content-type');
    if (!contentType) {
      // Should never happen - the same check is in this.helper.bodyObject()
      throw new HttpError415(`No Content-Type header`);
    }
    const schema = this.routeConfig.request?.body?.content[contentType]?.schema;
    if (!schema) {
      throw new HttpError415(`No schema for Content-Type: ${contentType}`);
    }
    return this.validateObject<T>(schema as ZodType<T>, body, `requestBody`, HttpError422);
  }

  async respondWith(response: Response): Promise<Response> {
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
