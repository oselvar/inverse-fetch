import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { APIContext, APIRoute } from 'astro';

import { makeResponse, type OpenAPI, type PathParams, type TypedPathParams } from '../index';

type Props = Record<string, unknown>;

export type OpenAPIContext<Params extends TypedPathParams, RequestBody> = APIContext<
  Props,
  PathParams
> & {
  openapi: OpenAPI<Params, RequestBody>;
};

type OpenAPIRoute<Params extends TypedPathParams, RequestBody> = (
  context: OpenAPIContext<Params, RequestBody>,
) => Promise<Response>;

export function openAPIRoute<Params extends TypedPathParams, RequestBody>(
  routeConfig: RouteConfig,
  route: OpenAPIRoute<Params, RequestBody>,
): APIRoute {
  const apiRoute: APIRoute = async (context) => {
    const params = context.params;
    const request = context.request;

    return makeResponse<Params, RequestBody>(routeConfig, params, request, (openapi) =>
      route({
        ...context,
        openapi,
      }),
    );
  };
  return apiRoute;
}
