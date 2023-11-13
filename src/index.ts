import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { type SafeParseReturnType, z, ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type FetchRouteContext<Params extends PathParams> = {
  params: Params;
  request: Request;
};

export type FetchRoute<Params extends PathParams = PathParams> = (
  context: FetchRouteContext<Params>,
) => Promise<Response>;

/**
 * The raw path params from the request.
 */
export type PathParams = Record<string, string | undefined>;

/**
 * The path params after being parsed by the route config.
 */
export type TypedPathParams = Record<string, string | number | undefined>;

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Respond = (body: unknown, status: number) => Response;

export const Response422: ResponseConfig = {
  description: 'The request body was invalid',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

export const Response404: ResponseConfig = {
  description: 'Not Found',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

export type OpenAPI<Params extends TypedPathParams, RequestBody> = {
  body: RequestBody;
  params: Params;
  respond: Respond;
};

type ValidateResult<T> = ValidateSuccess<T> | ValidateError;

type ValidateSuccess<T> = {
  success: true;
  data: T;
};

type ValidateError = {
  success: false;
  errorMessage: string;
};

function validate<T>(schema: ZodType<T>, value: unknown, name: string): ValidateResult<T> {
  const result = schema.safeParse(value) as SafeParseReturnType<unknown, T>;
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  const valueJson = JSON.stringify(value, null, 2);
  const schemaJson = JSON.stringify(zodToJsonSchema(schema), null, 2);
  const errorMessage = `Error validating ${name}: ${valueJson}\n\nSchema: ${schemaJson}`;
  return {
    success: false,
    errorMessage,
  };
}

export type HandleRequest<Params extends TypedPathParams, RequestBody> = (
  context: OpenAPI<Params, RequestBody>,
) => Promise<Response>;

export async function makeOpenAPI<Params extends TypedPathParams, RequestBody>(
  routeConfig: RouteConfig,
  params: PathParams,
  request: Request,
): Promise<OpenAPI<Params, RequestBody>> {
  const respond: Respond = (body, status) => response(routeConfig, body, status);

  const requestParamsResult = parseRequestParams<Params>(routeConfig, params);
  if (!requestParamsResult.success) {
    throw respond(requestParamsResult.errorMessage, 404);
  }

  const requestBodyResult = await parseRequestBody<RequestBody>(routeConfig, request);
  if (!requestBodyResult.success) {
    throw respond(requestBodyResult.errorMessage, 422);
  }

  const openapi: OpenAPI<Params, RequestBody> = {
    params: requestParamsResult.data,
    body: requestBodyResult.data,
    respond,
  };

  return openapi;
}

/**
 * @deprecated
 */
export async function makeResponseXXX<Params extends TypedPathParams, RequestBody>(
  routeConfig: RouteConfig,
  params: PathParams,
  request: Request,
  handleRequest: HandleRequest<Params, RequestBody>,
): Promise<Response> {
  const openapi = await makeOpenAPI<Params, RequestBody>(routeConfig, params, request);
  return handleRequest(openapi);
}

function parseRequestParams<T>(routeConfig: RouteConfig, params: Json): ValidateResult<T> {
  const schema = routeConfig.request?.params;
  if (schema === undefined) throw errorResponse('No request params schema');
  if (!(schema instanceof ZodType))
    throw errorResponse(`Request params schema is not a zod schema`);
  return validate<T>(schema as unknown as ZodType<T>, params, 'request params');
}

async function parseRequestBody<T>(
  routeConfig: RouteConfig,
  request: Request,
): Promise<ValidateResult<T>> {
  const contentType = request.headers.get('content-type');
  if (contentType) {
    const contentObject = routeConfig.request?.body?.content;
    if (!contentObject) throw errorResponse('No content object');
    const schema = contentObject[contentType].schema;
    if (!(schema instanceof ZodType))
      throw errorResponse(`Request body schema is not a zod schema`);
    const body = await request.json();
    return validate<T>(
      schema as ZodType<T>,
      body,
      `request body for ${request.method} ${request.url}`,
    );
  }
  return { data: null as T, success: true };
}

function response(routeConfig: RouteConfig, body: unknown, status: number): Response {
  const responseConfig = routeConfig.responses[status];
  if (!responseConfig) return errorResponse(`No response config for status ${status}`);
  if (!responseConfig.content)
    return errorResponse(`No response config content for status ${status}`);

  if (typeof body === 'string') {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } else if (typeof body === 'object') {
    const contentType = 'application/json';
    const schema = responseConfig.content[contentType].schema;
    if (!(schema instanceof ZodType))
      return errorResponse(`Response body schema is not a zod schema`);
    const result = validate(schema as ZodType<unknown>, body, 'response body');

    if (!result.success) {
      return errorResponse(result.errorMessage);
    }
    return new Response(JSON.stringify(result.data), {
      status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } else {
    return errorResponse(`Invalid body type: ${typeof body}`);
  }
}

function errorResponse(message: string): Response {
  console.error(message);
  return new Response(message, {
    status: 500,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
