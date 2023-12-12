import { Readable } from 'node:stream';

import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { IRouter } from 'express';

import type { FetchRoute } from '../index.js';

export function addRoute(
  expressRouter: IRouter,
  route: RouteConfig,
  handler: FetchRoute,
  port: number,
) {
  const path = route.path.replace(/{([^}]+)}/g, ':$1');

  expressRouter[route.method](path, (req, res) => {
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

    const stream = Readable.toWeb(req);

    const requestInit: RequestInit = {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      body: stream,
      // https://github.com/nodejs/node/issues/46221#issuecomment-1426707013
      duplex: 'half',
    };
    const request = new Request(url, requestInit);

    handler({
      params: req.params,
      request,
    })
      .then((response) => {
        res.status(response.status);
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        const body = response.body;
        if (body) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const writable = Readable.fromWeb(body);
          writable.pipe(res);
        } else {
          res.end();
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(503);
      });
  });
}
