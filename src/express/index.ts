import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { IRouter } from 'express';

import type { Endpoint } from '../file-based-routing/index.js';
import { importEndpoints } from '../file-based-routing/index.js';
import type { HttpMethod, ToErrorResponse } from '../index.js';
import { errorHandler, toColonPathPattern, toJsonErrorResponse } from '../index.js';

/**
 * File based routing for Express. Adds FetchHandler routes to an Express router.
 *
 * @param router the express router, for example `express()` or `express.Router()`.
 * @param routeDir the directory containing the routes.
 */
export async function addRoutes(router: IRouter, routeDir: string) {
  const endpoints = await importEndpoints(routeDir);
  for (const endpoint of endpoints) {
    // TODO: Add toErrorMessage - also in Fastify
    addRoute({ router, ...endpoint });
  }
}

export type AddRouteParams = Endpoint & {
  router: IRouter;
  toErrorResponse?: ToErrorResponse;
  port?: number;
};

export function addRoute(params: AddRouteParams) {
  const {
    router,
    method,
    pathPattern,
    handler,
    toErrorResponse = toJsonErrorResponse,
    port,
  } = params;
  const expressPath = toColonPathPattern(pathPattern);

  const lowerCaseMethod = method.toLowerCase() as Lowercase<HttpMethod>;
  router[lowerCaseMethod](expressPath, (expressRequest, expressResponse, nextFunction) => {
    const url = new URL(
      expressRequest.url,
      `${expressRequest.protocol}://${expressRequest.hostname}`,
    );
    if (port !== undefined) {
      url.port = String(port);
    }
    if (typeof expressRequest.query === 'string') {
      url.search = expressRequest.query;
    } else if (typeof expressRequest.query === 'object') {
      Object.entries(expressRequest.query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          url.searchParams.append(key, value);
        }
      });
    }

    const requestInit: RequestInit = {
      method: expressRequest.method,
      headers: new Headers(expressRequest.headers as Record<string, string>),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      body: Readable.toWeb(expressRequest),
      // https://github.com/nodejs/node/issues/46221#issuecomment-1426707013
      duplex: 'half',
    };
    const request = new Request(url, requestInit);

    const eh = errorHandler(handler, toErrorResponse);
    eh(request)
      .then((response) => {
        expressResponse.status(response.status);
        response.headers.forEach((value, key) => {
          expressResponse.setHeader(key, value);
        });
        if (response.body) {
          Readable.fromWeb(response.body as NodeReadableStream).pipe(expressResponse);
        } else {
          expressResponse.end();
        }
      })
      .catch(nextFunction);
  });
}
