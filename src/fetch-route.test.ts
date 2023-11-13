import assert from 'node:assert';

import { describe, expect, it } from 'vitest';

import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  respondWithBadTypeParams,
  thingRequest,
  thingRoute,
} from './test_helpers';

describe('FetchRoute', () => {
  it('validates request and response', async () => {
    const response = await thingRoute({
      params: goodParams,
      request: thingRequest(goodParams, goodThing),
    });
    const responseBody = await response.json();
    expect(responseBody).toEqual(goodThing);
  });

  it('responds with 404 for malformed path params', async () => {
    const response = await thingRoute({
      params: badParams,
      request: thingRequest(badParams, goodThing),
    });
    assert.strictEqual(response.status, 404);
  });

  it('responds with 422 for malformed request body', async () => {
    const response = await thingRoute({
      params: goodParams,
      request: thingRequest(goodParams, badThing),
    });
    assert.strictEqual(response.status, 422);
  });

  it('responds with 500 for malformed response body', async () => {
    const response = await thingRoute({
      params: respondWithBadTypeParams,
      request: thingRequest(respondWithBadTypeParams, goodThing),
    });
    assert.strictEqual(response.status, 500);
  });
});
