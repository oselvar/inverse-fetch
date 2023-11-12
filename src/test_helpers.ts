import { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Response404 } from '.';

const ThingParamsSchema = z.object({
  thingId: z.string().regex(/[\d]+/),
});

const ThingSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const thingRouteConfig: RouteConfig = {
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
  },
};

type Thing = z.infer<typeof ThingSchema>;

export const goodThing: Thing = {
  name: 'My thing',
  description: 'The best thing ever',
};

type ThingParams = z.infer<typeof ThingParamsSchema>;

export const goodParams: ThingParams = {
  thingId: '1',
};

export const badParams: ThingParams = {
  thingId: 'xyz',
};

export function thingRequest({ thingId }: ThingParams) {
  return new Request(`http://localhost:3000/things/${encodeURIComponent(thingId)}`, {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(goodThing),
  });
}
