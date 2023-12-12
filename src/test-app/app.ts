import { extendZodWithOpenApi, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import type { FetchRoute } from '../index.js';
import {
  Response404,
  Response415,
  Response422,
  Response500,
  toHttpError,
  Validator,
} from '../index.js';
import { registry } from './registry.js';

extendZodWithOpenApi(z);

// Define Zod schemas for the request parameters, query and body

const ThingParamsSchema = z
  .object({
    thingId: z.string().regex(/[\d]+/),
  })
  .openapi({});

const ThingQuerySchema = z
  .object({
    thingId: z.string().regex(/[\d]+/).optional(),
  })
  .openapi({});

const ThingBodySchema = z
  .object({
    name: z.string().regex(/[a-z]+/),
    description: z.string().regex(/[a-z]+/),
  })
  .openapi({});

// Define an OpenAPI route using https://github.com/asteasolutions/zod-to-openapi

export const routeConfig: RouteConfig = {
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

registry.registerPath(routeConfig);

const createThingValidator = new Validator(routeConfig);

type ThingBody = z.infer<typeof ThingBodySchema>;

export const goodThing: ThingBody = {
  name: 'mything',
  description: 'besthingever',
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
  const params = createThingValidator.params<z.infer<typeof ThingParamsSchema>>(ctx.params);
  const body = await createThingValidator.body<z.infer<typeof ThingBodySchema>>(ctx.request);
  if (params.thingId === respondWithBadTypeParams.thingId) {
    return createThingValidator.validate(Response.json({ foo: 'bar' }));
  }
  return createThingValidator.validate(Response.json(body));
};

export const thingRoute: FetchRoute = async (ctx) => {
  try {
    return await _thingRoute(ctx);
  } catch (error) {
    const { response } = toHttpError(error);
    return response;
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
