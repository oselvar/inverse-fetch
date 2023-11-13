import { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { FetchRoute, makeOpenAPI, Response404, Response422 } from '.';

const ThingParamsSchema = z.object({
  thingId: z.string().regex(/[\d]+/),
});

const ThingSchema = z.object({
  name: z.string().regex(/[a-z]+/),
  description: z.string().regex(/[a-z]+/),
});

const thingRouteConfig: RouteConfig = {
  method: 'post',
  path: '/things/{thingId}',
  request: {
    params: ThingParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: ThingSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Create a thing',
      content: {
        'application/json': {
          schema: ThingSchema,
        },
      },
    },
    404: Response404,
    422: Response422,
  },
};

type Thing = z.infer<typeof ThingSchema>;

export const goodThing: Thing = {
  name: 'mything',
  description: 'bestghingever',
};

export const badThing: Thing = {
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

export const thingRoute: FetchRoute = async ({ params, request }) => {
  const { body, respond } = await makeOpenAPI(thingRouteConfig, params, request);
  return respond(body, 200);
};

export function thingRequest({ thingId }: ThingParams, thing: Thing) {
  return new Request(`http://host.com/things/${encodeURIComponent(thingId)}`, {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(thing),
  });
}
