import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { IRouter } from 'express';

import type { FetchHandler, ToErrorResponse } from '../index.js';
import { toHttpError, toJsonEerrorResponse } from '../index.js';

export type AddRouteParams = {
  router: IRouter;
  route: RouteConfig;
  handler: FetchHandler;
  toErrorResponse?: ToErrorResponse;
  port: number;
};

export function addRoute(params: AddRouteParams) {
  const { router, route, handler, toErrorResponse = toJsonEerrorResponse, port } = params;
  const path = route.path.replace(/{([^}]+)}/g, ':$1');

  router[route.method](path, (req, res) => {
    const url = new URL(req.url, `${req.protocol}://${req.hostname}:${port}`);
    if (typeof req.query === 'string') {
      url.search = req.query;
    } else if (typeof req.query === 'object') {
      Object.entries(req.query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          url.searchParams.append(key, value);
        }
      });
    }

    const requestInit: RequestInit = {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      body: Readable.toWeb(req),
      // https://github.com/nodejs/node/issues/46221#issuecomment-1426707013
      duplex: 'half',
    };
    const request = new Request(url, requestInit);

    function writeResponse(response: Response) {
      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      if (response.body) {
        Readable.fromWeb(response.body as NodeReadableStream).pipe(res);
      } else {
        res.end();
      }
    }

    handler(request)
      .then(writeResponse)
      .catch((error) => {
        const httpError = toHttpError(error);
        const response = toErrorResponse(httpError);
        writeResponse(response);
      });
  });
}
