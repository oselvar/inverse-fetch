import express from 'express';
import getPort from 'get-port';
import { describe } from 'vitest';

import { defineAcceptanceTests } from '../defineContract.js';
import { Api, HttpClient } from '../test-app/ApiClient.js';
import { routeDir } from '../test-app/app.js';
import {} from '../test-app/routes/things/{thingId}/POST.js';
import { addRoutes } from './index.js';

describe('express/addRoutes', () => {
  defineAcceptanceTests(async () => {
    const app = express();
    await addRoutes(app, routeDir);
    const port = await getPort();
    const server = app.listen(port);
    const httpClient = new HttpClient({ baseUrl: `http://localhost:${port}` });
    const api = new Api(httpClient);
    return {
      api,
      stop() {
        server.close();
      },
    };
  });
});
