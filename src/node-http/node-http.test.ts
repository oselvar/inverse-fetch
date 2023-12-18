import getPort from 'get-port';
import http from 'http';
import { describe } from 'vitest';

import { defineAcceptanceTests } from '../defineContract.js';
import { Api, HttpClient } from '../test-app/ApiClient.js';
import { routeDir } from '../test-app/app.js';
import {} from '../test-app/routes/things/{thingId}/POST.js';
import { createRequestListener } from './index.js';

describe('express/addRoutes', () => {
  defineAcceptanceTests(async () => {
    const requestListener = await createRequestListener(routeDir);
    const server = http.createServer(requestListener);

    const port = await getPort();
    await new Promise<void>((resolve) => server.listen(port, resolve));

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
