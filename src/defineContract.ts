import { afterEach, beforeEach, expect, it } from 'vitest';

import type { Api } from './test-app/ApiClient';
import {
  badParams,
  goodParams,
  respondWithBadTypeParams,
} from './test-app/routes/things/{thingId}/POST';

type TestContext = {
  api: Api<unknown>;
  stop(): void;
};

export function defineAcceptanceTests(getContext: () => Promise<TestContext>) {
  let testContext: TestContext;
  let api: Api<unknown>;

  beforeEach(async () => {
    testContext = await getContext();
    api = testContext.api;
  });

  afterEach(() => {
    testContext.stop();
  });

  it('makes a successful request', async () => {
    const res = await api.things.thingsCreate(goodParams, {
      name: 'mything',
      description: 'besthingever',
    });
    expect(res.status).toEqual(200);
    expect(res.data).toEqual({ name: 'mything', description: 'besthingever' });
  });

  it('makes a 404 request', async () => {
    const res = await api.things.thingsCreate(badParams, {
      name: 'mything',
      description: 'besthingever',
    });
    expect(res.status).toEqual(404);
    expect(res.data).toEqual(null);
  });

  it('makes a 500 request', async () => {
    const res = await api.things.thingsCreate(respondWithBadTypeParams, {
      name: 'mything',
      description: 'besthingever',
    });
    expect(res.status).toEqual(500);
    expect(res.data).toEqual(null);
  });
}
