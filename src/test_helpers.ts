import { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { FetchRoute, ValidationError, Validator } from '.';

const Response404: ResponseConfig = {
  description: 'Not Found',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

const Response415: ResponseConfig = {
  description: 'Unsupported Media Type',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

const Response422: ResponseConfig = {
  description: 'Unprocessable Entity',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

const Response500: ResponseConfig = {
  description: 'Internal Server Error',
  content: {
    'application/text': {
      schema: z.string(),
    },
  },
};

const ThingParamsSchema = z.object({
  thingId: z.string().regex(/[\d]+/),
});

const ThingQuerySchema = z.object({
  thingId: z.string().regex(/[\d]+/).optional(),
});

const ThingBodySchema = z.object({
  name: z.string().regex(/[a-z]+/),
  description: z.string().regex(/[a-z]+/),
});

const routeConfig: RouteConfig = {
  method: 'post',
  path: '/things/{thingId}',
  request: {
    params: ThingParamsSchema,
    query: ThingQuerySchema,
    body: {
      content: {
        'application/json': {
          schema: ThingBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Create a thing',
      content: {
        'application/json': {
          schema: ThingBodySchema,
        },
      },
    },
    404: Response404,
    415: Response415,
    422: Response422,
    500: Response500,
  },
};

const validator = new Validator(routeConfig);

type ThingBody = z.infer<typeof ThingBodySchema>;

export const goodThing: ThingBody = {
  name: 'mything',
  description: 'bestghingever',
};

export const badThing: ThingBody = {
  name: 'MYTHING',
  description: 'WORSTTHINGEVER',
};

type ThingParams = z.infer<typeof ThingParamsSchema>;

export const goodParams: ThingParams = {
  thingId: '1',
};

export const badParams: ThingParams = {
  thingId: 'xyz',
};

export const respondWithBadTypeParams: ThingParams = {
  thingId: '2',
};

const _thingRoute: FetchRoute = async (ctx) => {
  const params = validator.params<z.infer<typeof ThingParamsSchema>>(ctx.params);
  const body = await validator.body<z.infer<typeof ThingBodySchema>>(ctx.request);
  if (params.thingId === respondWithBadTypeParams.thingId) {
    return validator.validate(Response.json({ foo: 'bar' }));
  }
  return validator.validate(Response.json(body));
};

export const thingRoute: FetchRoute = async (ctx) => {
  try {
    return await _thingRoute(ctx);
  } catch (error) {
    if (error instanceof Error) {
      const status = error instanceof ValidationError ? error.status : 500;
      return new Response(error.message, { status });
    } else {
      return new Response('Unknown error', { status: 500 });
    }
  }
};

export function thingRequest({ thingId }: ThingParams, thing: ThingBody) {
  return new Request(`http://host.com/things/${encodeURIComponent(thingId)}`, {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(thing),
  });
}
