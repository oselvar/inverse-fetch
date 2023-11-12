import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { openAPIRoute } from './index.js';
import { APIContext } from 'astro';
import { Thing, ThingParams, request, thingRouteConfig } from '../test_helpers';

describe('openAPIHandler', () => {
  it('validates request and response', async () => {
    const params: z.infer<typeof ThingParams> = {
      thingId: '1',
    };

    const thing: z.infer<typeof Thing> = {
      name: 'My thing',
      description: 'The best thing ever',
    };

    const route = openAPIRoute(thingRouteConfig, async ({ openapi }) => {
      const { body, respond } = openapi;
      return respond(body, 200);
    });

    const context: Partial<APIContext> = {
      request: request(),
      params,
    };

    const result = (await route(context as APIContext)) as Response;
    const responseBody = await result.json();
    expect(responseBody).toEqual(thing);
  });
});
