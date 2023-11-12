import { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Response404 } from '.';

export const ThingParams = z.object({
  thingId: z.string().regex(/[\d]+/),
});

export const Thing = z.object({
  name: z.string(),
  description: z.string(),
});

export const thingRouteConfig: RouteConfig = {
  method: 'post',
  path: '/things/{thingId}',
  request: {
    params: ThingParams,
    body: {
      content: {
        'application/json': {
          schema: Thing,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Create a thing',
      content: {
        'application/json': {
          schema: Thing,
        },
      },
    },
    404: Response404,
  },
};

export const goodThing: z.infer<typeof Thing> = {
  name: 'My thing',
  description: 'The best thing ever',
};

export const goodParams: z.infer<typeof ThingParams> = {
  thingId: '1',
};

export const badParams: z.infer<typeof ThingParams> = {
  thingId: 'xyz',
};

export function request() {
  return new Request('http://localhost:3000/things/1', {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(goodThing),
  });
}
