import express from 'express';
import type { Server } from 'http';
import { afterEach, beforeEach, describe } from 'vitest';

import { defineAcceptanceTests } from '../defineContract.js';
import { Api, HttpClient } from '../test-app/ApiClient.js';
import { routeDir } from '../test-app/app.js';
import {} from '../test-app/routes/things/{thingId}/POST';
import { addRoutes } from './index.js';

describe('express/addRoutes', () => {
  const port = 3000;
  let app: express.Express;
  let server: Server;

  const api = new Api(new HttpClient());

  beforeEach(async () => {
    app = express();
    await addRoutes(app, routeDir);
    server = app.listen(port);
  });

  afterEach(() => {
    server.close();
  });

  defineAcceptanceTests(api);
});
