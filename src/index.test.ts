import { describe, it, expect } from 'vitest';
import { makeResponse } from './index.js';
import { z } from 'zod';
import {
  goodThing,
  ThingParams,
  request,
  thingRouteConfig,
  goodParams,
  badParams,
} from './test_helpers.js';

describe('makeResponse', () => {
  it('validates request and response', async () => {
    const response = await makeResponse(
      thingRouteConfig,
      goodParams,
      request(),
      async ({ body, respond }) => {
        return respond(body, 200);
      },
    );
    const responseBody = await response.json();
    expect(responseBody).toEqual(goodThing);
  });

  it('returns 404 for malformed path params', async () => {
    const response = await makeResponse(
      thingRouteConfig,
      badParams,
      request(),
      async ({ body, respond }) => {
        return respond(body, 200);
      },
    );
    expect(response.status).toEqual(404);
  });
});
