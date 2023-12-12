import express from 'express';
import type { Server } from 'http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Api, HttpClient } from '../test-app/ApiClient.js';
import { routeConfig, thingRoute } from '../test-app/app.js';
import { addRoute } from './index.js';

describe('expressApp', () => {
  const port = 3000;
  let app: express.Express;
  let server: Server;

  beforeEach(() => {
    app = express();

    const route = routeConfig;
    const handler = thingRoute;
    addRoute(app, route, handler, port);

    server = app.listen(port);
  });

  afterEach(() => {
    server.close();
  });

  it('does something', async () => {
    const httpClient = new HttpClient();
    const api = new Api(httpClient);
    const res = await api.things.thingsCreate(
      { thingId: '1' },
      { name: 'mything', description: 'besthingever' },
    );
    expect(res.status).toEqual(200);
    const body = res.data;
    expect(body).toEqual({ name: 'mything', description: 'besthingever' });
  });
});
