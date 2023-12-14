import { describe, expect, it } from 'vitest';

import { HttpError404, HttpError415, HttpError422, HttpError500 } from './index.js';
import type { ThingBody, ThingParams } from './test-app/routes/things/{thingId}/POST.js';
import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  handler,
  respondWithBadTypeParams,
} from './test-app/routes/things/{thingId}/POST.js';

describe('FetchRoute', () => {
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
