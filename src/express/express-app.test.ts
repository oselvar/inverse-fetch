import express from 'express';
import type { Server } from 'http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { errorHandler } from '../index.js';
import { Api, HttpClient } from '../test-app/ApiClient.js';
import { routeDir } from '../test-app/app.js';
import {
  badParams,
  goodParams,
  handler,
  respondWithBadTypeParams,
} from '../test-app/routes/things/{thingId}/POST';
import { addRoutes } from './index.js';

describe('expressApp', () => {
  const port = 3000;
  let app: express.Express;
  let server: Server;
  let api: Api<unknown>;

  beforeEach(async () => {
    app = express();
    await addRoutes(app, routeDir);
    server = app.listen(port);

    const httpClient = new HttpClient({
      customFetch: errorHandler(handler),
    });
    api = new Api(httpClient);
  });

  afterEach(() => {
    server.close();
  });

  it.only('makes a successful request', async () => {
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
});
