import Fastify from 'fastify';
import getPort from 'get-port';
import { describe } from 'vitest';

import { defineAcceptanceTests } from '../defineContract.js';
import { Api, HttpClient } from '../test-app/ApiClient.js';
import { routeDir } from '../test-app/app.js';
import {} from '../test-app/routes/things/{thingId}/POST.js';
import { addRoutes } from './index.js';

describe('fastify/addRoutes', () => {
  defineAcceptanceTests(async () => {
    const fastify = Fastify();
    fastify.removeAllContentTypeParsers();
    fastify.addContentTypeParser('*', function (_request, payload, done) {
      done(null, payload);
    });

    await addRoutes(fastify, routeDir);
    const port = await getPort();
    const baseUrl = await fastify.listen({ port });
    const httpClient = new HttpClient({ baseUrl });
    const api = new Api(httpClient);
    return {
      api,
      stop() {
        fastify.close();
      },
    };
  });
});
