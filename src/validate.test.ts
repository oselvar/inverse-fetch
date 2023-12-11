import { describe, expect, it } from 'vitest';

import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  respondWithBadTypeParams,
  thingRequest,
  thingRoute,
} from './test-app/app';

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
    expect(response.status).toEqual(404);
  });

  it('responds with 415 for unsupported media type', async () => {
    const response = await thingRoute({
      params: goodParams,
      request: new Request(`http://host.com/things/${encodeURIComponent(goodParams.thingId)}`, {
        method: 'post',
        headers: {
          'content-type': 'text/csv',
        },
        body: `foo,bar,baz\n1,2,3`,
      }),
    });
    expect(response.status).toEqual(415);
  });

  it('responds with 422 for malformed request body', async () => {
    const response = await thingRoute({
      params: goodParams,
      request: thingRequest(goodParams, badThing),
    });
    expect(response.status).toEqual(422);
  });

  it('responds with 500 for malformed response body', async () => {
    const response = await thingRoute({
      params: respondWithBadTypeParams,
      request: thingRequest(respondWithBadTypeParams, goodThing),
    });
    expect(response.status).toEqual(500);
  });
});
