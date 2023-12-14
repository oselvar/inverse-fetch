import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { IRouter } from 'express';

import type { FetchHandler, HttpMethod, ToErrorResponse } from '../index.js';
import { errorHandler, toJsonErrorResponse } from '../index.js';

export type AddRouteParams = {
  router: IRouter;
  method: HttpMethod;
  path: string;
  handler: FetchHandler;
  toErrorResponse?: ToErrorResponse;
  port?: number;
};

export function addRoute(params: AddRouteParams) {
  const { router, method, path, handler, toErrorResponse = toJsonErrorResponse, port } = params;
  const expressPath = path.replace(/{([^}]+)}/g, ':$1');

  router[method](expressPath, (req, res, next) => {
    const url = new URL(req.url, `${req.protocol}://${req.hostname}`);
    if (port !== undefined) {
      url.port = String(port);
    }
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

    const eh = errorHandler(handler, toErrorResponse);
    eh(request)
      .then((response) => {
        res.status(response.status);
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        if (response.body) {
          Readable.fromWeb(response.body as NodeReadableStream).pipe(res);
        } else {
          res.end();
        }
      })
      .catch(next);
  });
}
