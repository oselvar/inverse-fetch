import { APIContext } from 'astro';
import { describe, expect, it } from 'vitest';

import { goodParams, goodThing, thingRequest, thingRouteConfig } from '../test_helpers';
import { openAPIRoute } from './index.js';

describe('openAPIHandler', () => {
  it('validates request and response', async () => {
    const route = openAPIRoute(thingRouteConfig, async ({ openapi }) => {
      const { body, respond } = openapi;
      return respond(body, 200);
    });

    const context: Partial<APIContext> = {
      request: thingRequest(goodParams),
      params: goodParams,
    };

    const result = (await route(context as APIContext)) as Response;
    const responseBody = await result.json();
    expect(responseBody).toEqual(goodThing);
  });
});
