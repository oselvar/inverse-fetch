import assert from 'node:assert';

import { describe, expect, it } from 'vitest';

import { FetchRoute, makeOpenAPI } from '.';
import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  thingRequest,
  thingRouteConfig,
} from './test_helpers';

const thingRoute: FetchRoute = async ({ params, request }) => {
  const { body, respond } = await makeOpenAPI(thingRouteConfig, params, request);
  return respond(body, 200);
};

describe('FetchRoute', () => {
  it('validates request and response', async () => {
    const response = await thingRoute({
      params: goodParams,
      request: thingRequest(goodParams),
    });
    const responseBody = await response.json();
    expect(responseBody).toEqual(goodThing);
  });

  it('responds with 404 for malformed path params', async () => {
    await assert.rejects(
      thingRoute({
        params: badParams,
        request: thingRequest(badParams),
      }),
      (response: Response) => {
        assert.strictEqual(response.status, 404);
        return true;
      },
    );
  });

  it('responds with 422 for malformed request body', async () => {
    await assert.rejects(
      thingRoute({
        params: goodParams,
        request: thingRequest(goodParams, badThing),
      }),
      (response: Response) => {
        assert.strictEqual(response.status, 422);
        return true;
      },
    );
  });
});
