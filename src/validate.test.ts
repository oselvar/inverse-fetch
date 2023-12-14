import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defineAcceptanceTests } from './defineContract.js';
import { errorHandler, HttpError404, HttpError415, HttpError422, HttpError500 } from './index.js';
import { Api, HttpClient } from './test-app/ApiClient.js';
import type { ThingBody, ThingParams } from './test-app/routes/things/{thingId}/POST.js';
import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  handler,
  respondWithBadTypeParams,
  route,
} from './test-app/routes/things/{thingId}/POST.js';

describe('FetchRoute', () => {
  beforeEach(() => {
    // This is set by file-based routing.
    // Since we're not using file-based routing here, we need to set it manually.
    route.path = '/things/{thingId}';
  });

  afterEach(() => {
    // Unset the path so that it doesn't leak into other tests.
    route.path = undefined;
  });

  it('validates request and response', async () => {
    const response = await handler(thingRequest(goodParams, goodThing));
    const responseBody = await response.json();
    expect(responseBody).toEqual(goodThing);
  });

  it('throws 404 error for malformed path params', async () => {
    expect(handler(thingRequest(badParams, goodThing))).rejects.toThrowError(HttpError404);
  });

  it('throws 415 error for unsupported media type', async () => {
    expect(
      handler(
        new Request(`http://host.com/things/${encodeURIComponent(goodParams.thingId)}`, {
          method: 'post',
          headers: {
            'content-type': 'text/csv',
          },
          body: `foo,bar,baz\n1,2,3`,
        }),
      ),
    ).rejects.toThrowError(HttpError415);
  });

  it('throws 422 error for malformed request body', async () => {
    expect(handler(thingRequest(goodParams, badThing))).rejects.toThrowError(HttpError422);
  });

  it('throws 500 error for malformed response body', async () => {
    expect(handler(thingRequest(respondWithBadTypeParams, goodThing))).rejects.toThrowError(
      HttpError500,
    );
  });

  describe('acceptance', () => {
    defineAcceptanceTests(async () => {
      const api = new Api(
        new HttpClient({
          customFetch: errorHandler(handler),
        }),
      );

      return {
        api,
        stop() {
          // no-op
        },
      };
    });
  });
});

export function thingRequest({ thingId }: ThingParams, thing: ThingBody) {
  return new Request(`http://host.com/things/${encodeURIComponent(thingId)}`, {
    method: 'post',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(thing),
  });
}
