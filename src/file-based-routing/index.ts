import { basename, dirname, relative } from 'node:path';

import fg from 'fast-glob';

import { type FetchHandler, type HttpMethod, HttpMethods } from '../index.js';
import type { Route } from '../openapi/index.js';

const __dirname = new URL('.', import.meta.url).pathname;

export type Endpoint = {
  pathPattern: string;
  method: HttpMethod;
  handler: FetchHandler;
  route: Route;
};

export async function importEndpoints(routeDir: string): Promise<readonly Endpoint[]> {
  const routeGlob = `${routeDir}/**/{${HttpMethods.join(',')}}.ts`;
  const routeFiles = (await fg(routeGlob)).sort();

  const result: Endpoint[] = [];
  for (const routeFile of routeFiles) {
    const importPath = relative(__dirname, routeFile);
    const module = await import(importPath);

    const pathPattern = '/' + dirname(relative(routeDir, routeFile));
    const method = basename(routeFile, '.ts') as HttpMethod;

    if (module.route) {
      const route: Route = module.route;
      route.path = pathPattern;
    }

    if (module.handler) {
      result.push({
        pathPattern,
        method,
        handler: module.handler,
        route: module.route,
      });
    }
  }
  return result;
}
