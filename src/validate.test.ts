import { describe, expect, it } from 'vitest';

import { HttpError404, HttpError415 } from './index.js';
import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  respondWithBadTypeParams,
  thingHandler,
  thingRequest,
} from './test-app/app';

describe('FetchRoute', () => {
  it('validates request and response', async () => {
    const response = await thingHandler(thingRequest(goodParams, goodThing), {
      params: goodParams,
    });
    const responseBody = await response.json();
    expect(responseBody).toEqual(goodThing);
  });

  it('throws 404 error for malformed path params', async () => {
    expect(
      thingHandler(thingRequest(badParams, goodThing), {
        params: badParams,
      }),
    ).rejects.toThrowError(HttpError404);
  });

  it('throws 415 error for unsupported media type', async () => {
    expect(
      thingHandler(
        new Request(`http://host.com/things/${encodeURIComponent(goodParams.thingId)}`, {
          method: 'post',
          headers: {
            'content-type': 'text/csv',
          },
          body: `foo,bar,baz\n1,2,3`,
        }),
        {
          params: goodParams,
        },
      ),
    ).rejects.toThrowError(HttpError415);
  });

  it('throws 422 error for malformed request body', async () => {
    expect(
      thingHandler(thingRequest(goodParams, badThing), {
        params: goodParams,
      }),
    ).rejects.toThrowError(/Error validating requestBody/);
  });

  it('responds with 500 for malformed response body', async () => {
    const response = await thingHandler(thingRequest(respondWithBadTypeParams, goodThing), {
      params: respondWithBadTypeParams,
    });
    expect(response.status).toEqual(500);
  });
});
