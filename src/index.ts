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

export const Response404: ResponseConfig = {
  description: 'Not Found',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

export const Response415: ResponseConfig = {
  description: 'Unsupported Media Type',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

export const Response422: ResponseConfig = {
  description: 'Unprocessable Entity',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

export const Response500: ResponseConfig = {
  description: 'Internal Server Error',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

export type ValidationResult<Params extends TypedPathParams, RequestBody> =
  | ValidationError<Params, RequestBody>
  | ValidationSuccess<Params, RequestBody>;

export type ValidationError<Params extends TypedPathParams, RequestBody> = {
  params: Params | null;
  body: RequestBody | null;
  respond: Respond;
  response: Response;
};

export type ValidationSuccess<Params extends TypedPathParams, RequestBody> = {
  params: Params;
  body: RequestBody;
  respond: Respond;
  response: null;
};

type ValidateResult<T> = ValidateSuccess<T> | ValidateError;

type ValidateSuccess<T> = {
  data: T;
  response: null;
};

type ValidateError = {
  data: null;
  response: Response;
};

function validateObject<T>(
  schema: ZodType<T>,
  value: unknown,
  name: string,
  errorStatus: number,
): ValidateResult<T> {
  const result = schema.safeParse(value) as SafeParseReturnType<unknown, T>;
  if (result.success) {
    return {
      data: result.data,
      response: null,
    };
  }
  const valueJson = JSON.stringify(value, null, 2);
  const schemaJson = JSON.stringify(zodToJsonSchema(schema), null, 2);
  const errorMessage = `Error validating ${name}: ${valueJson}\n\nSchema: ${schemaJson}`;
  return {
    data: null,
    response: textResponse(errorMessage, errorStatus),
  };
}

export type HandleRequest<Params extends TypedPathParams, RequestBody> = (
  context: ValidationResult<Params, RequestBody>,
) => Promise<Response>;

export async function validate<
  Params extends TypedPathParams = TypedPathParams,
  RequestBody = unknown,
>(
  routeConfig: RouteConfig,
  params: PathParams,
  request: Request,
): Promise<ValidationResult<Params, RequestBody>> {
  const respond: Respond = (body, status) => response(routeConfig, body, status);

  try {
    const requestParamsResult = parseRequestParams<Params>(routeConfig, params);
    if (requestParamsResult.response) {
      return {
        params: null,
        body: null,
        respond,
        response: requestParamsResult.response,
      };
    }

    const requestBodyResult = await parseRequestBody<RequestBody>(routeConfig, request);
    if (requestBodyResult.response) {
      return {
        params: requestParamsResult.data,
        body: null,
        respond,
        response: requestBodyResult.response,
      };
    }

    return {
      params: requestParamsResult.data,
      body: requestBodyResult.data,
      respond,
      response: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : JSON.stringify(error);
    return {
      params: null,
      body: null,
      respond,
      response: textResponse(message, 500),
    };
  }
}

function parseRequestParams<T>(routeConfig: RouteConfig, params: Json): ValidateResult<T> {
  const schema = routeConfig.request?.params;
  if (schema === undefined) {
    return {
      data: null,
      response: textResponse('No request params schema', 500),
    };
  }
  return validateObject<T>(schema as unknown as ZodType<T>, params, 'request params', 404);
}

async function parseRequestBody<T>(
  routeConfig: RouteConfig,
  request: Request,
): Promise<ValidateResult<T>> {
  const contentType = request.headers.get('content-type');
  if (!contentType) {
    return { data: null as T, response: null };
  }
  if (contentType === 'application/json') {
    const contentObject = routeConfig.request?.body?.content;
    if (!contentObject)
      return {
        data: null,
        response: textResponse('No content object', 500),
      };
    const schema = contentObject[contentType].schema;
    const body = await request.json();
    return validateObject<T>(
      schema as ZodType<T>,
      body,
      `request body for ${request.method} ${request.url}`,
      422,
    );
  }
  return {
    data: null,
    response: textResponse(`Unsupported content type: ${contentType}`, 415),
  };
}

function response(routeConfig: RouteConfig, body: unknown, status: number): Response {
  const responseConfig = routeConfig.responses[status];
  if (!responseConfig) return textResponse(`No response config for status ${status}`, 500);
  if (!responseConfig.content)
    return textResponse(`No response config content for status ${status}`, 500);

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
    const result = validateObject(schema as ZodType<unknown>, body, 'response body', 500);

    if (result.response) {
      return result.response;
    }
    return new Response(JSON.stringify(result.data), {
      status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } else {
    return textResponse(`Invalid body type: ${typeof body}`, 415);
  }
}

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
