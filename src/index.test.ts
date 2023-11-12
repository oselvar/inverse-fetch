import { describe, it, expect } from 'vitest';
import { makeResponse } from './index.js';
import { z } from 'zod';
import { thing, ThingParams, request, thingRouteConfig } from './test_helpers.js';

describe('makeResponse', () => {
  it('validates request and response', async () => {
    const params: z.infer<typeof ThingParams> = {
      thingId: '1',
    };

    const response = await makeResponse(
      thingRouteConfig,
      params,
      request(),
      async ({ body, respond }) => {
        return respond(body, 200);
      },
    );
    const responseBody = await response.json();
    expect(responseBody).toEqual(thing);
  });

  it('returns 404 for malformed path params', async () => {
    const params: z.infer<typeof ThingParams> = {
      thingId: 'xyz',
    };

    const response = await makeResponse(
      thingRouteConfig,
      params,
      request(),
      async ({ body, respond }) => {
        return respond(body, 200);
      },
    );
    expect(response.status).toEqual(404);
  });
});
