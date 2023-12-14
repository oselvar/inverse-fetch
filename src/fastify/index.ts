import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { FastifyInstance, RequestGenericInterface } from 'fastify';

import type { Endpoint } from '../file-based-routing/index.js';
import { importEndpoints } from '../file-based-routing/index.js';
import type { HttpMethod, ToErrorResponse } from '../index.js';
import { errorHandler, toJsonErrorResponse } from '../index.js';

/**
 * File based routing for Fastify. Adds FetchHandler routes to a Fastify instance.
 *
 * @param fastify the fastify instance.
 * @param routeDir the directory containing the routes.
 */
export async function addRoutes(fastify: FastifyInstance, routeDir: string) {
  const endpoints = await importEndpoints(routeDir);
  for (const endpoint of endpoints) {
    addRoute({ fastify, ...endpoint });
  }
}

export type AddRouteParams = Endpoint & {
  fastify: FastifyInstance;
  toErrorResponse?: ToErrorResponse;
  port?: number;
};

interface requestGeneric extends RequestGenericInterface {
  Querystring: Record<string, string>;
}

export function addRoute(params: AddRouteParams) {
  const {
    fastify,
    method,
    pathPattern: path,
    handler,
    toErrorResponse = toJsonErrorResponse,
    port,
  } = params;
  const fastifyPath = path.replace(/{([^}]+)}/g, ':$1');

  const lowerCaseMethod = method.toLowerCase() as Lowercase<HttpMethod>;
  if (lowerCaseMethod === 'trace') {
    throw new Error('TRACE method is not supported by Fastify');
  }
  fastify[lowerCaseMethod]<requestGeneric>(fastifyPath, (fastifyRequest, fastifyReply) => {
    const url = new URL(
      fastifyRequest.url,
      `${fastifyRequest.protocol}://${fastifyRequest.hostname}`,
    );
    if (port !== undefined) {
      url.port = String(port);
    }

    Object.entries(fastifyRequest.query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const requestInit: RequestInit = {
      method: fastifyRequest.method,
      headers: new Headers(fastifyRequest.headers as Record<string, string>),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      body: Readable.toWeb(fastifyRequest.body),
      // https://github.com/nodejs/node/issues/46221#issuecomment-1426707013
      duplex: 'half',
    };
    const request = new Request(url, requestInit);

    const eh = errorHandler(handler, toErrorResponse);
    eh(request).then((response) => {
      fastifyReply.status(response.status);
      response.headers.forEach((value, key) => {
        fastifyReply.header(key, value);
      });
      if (response.body) {
        fastifyReply.send(Readable.fromWeb(response.body as NodeReadableStream));
      } else {
        // fastifyReply.end();
      }
    });
  });
}
