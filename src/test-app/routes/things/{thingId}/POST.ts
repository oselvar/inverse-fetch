import { type FetchHandler } from '../../../../index.js';
import type { Route } from '../../../../openapi/index.js';
import {
  OpenAPIHelper,
  Response404,
  Response415,
  Response422,
  Response500,
} from '../../../../openapi/index.js';
import { z } from '../../../registry.js';

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

export const route: Route = {
  request: {
    params: ThingParamsSchema,
    query: ThingQuerySchema,
    body: {
      content: {
        'application/json': {
          schema: ThingBodySchema,
        },
        'application/x-www-form-urlencoded': {
          schema: ThingBodySchema,
        },
        'multipart/form-data': {
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

export type ThingParams = z.infer<typeof ThingParamsSchema>;
export type ThingBody = z.infer<typeof ThingBodySchema>;

export const handler: FetchHandler = async (input, init) => {
  const helper = new OpenAPIHelper(route, input, init);

  const params = helper.params<ThingParams>();
  const body = await helper.bodyObject<ThingBody>();
  if (params.thingId === respondWithBadTypeParams.thingId) {
    return helper.respondWith(Response.json({ foo: 'bar' }));
  }
  return helper.respondWith(Response.json(body));
};

// Test data

export const goodThing: ThingBody = {
  name: 'mything',
  description: 'besthingever',
};

export const badThing: ThingBody = {
  name: 'MYTHING',
  description: 'WORSTTHINGEVER',
};

export const goodParams: ThingParams = {
  thingId: '1',
};

export const badParams: ThingParams = {
  thingId: 'xyz',
};

export const respondWithBadTypeParams: ThingParams = {
  thingId: '2',
};
