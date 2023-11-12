import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Handler,
} from 'aws-lambda';
type ProxyHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

import { makeResponse, type OpenAPI, type TypedPathParams } from '../index';

export type OpenAPIEvent<Params extends TypedPathParams, RequestBody> = APIGatewayProxyEventV2 & {
  openapi: OpenAPI<Params, RequestBody>;
};

type OpenAPIHandler<Params extends TypedPathParams, RequestBody> = (
  event: OpenAPIEvent<Params, RequestBody>,
) => Promise<Response>;

export function openAPIHandler<Params extends TypedPathParams, RequestBody>(
  routeConfig: RouteConfig,
  handler: OpenAPIHandler<Params, RequestBody>,
): ProxyHandler {
  const proxyHandler: ProxyHandler = async (event) => {
    const request = toRequest(event);
    const params = event.pathParameters || {};

    const response = await makeResponse<Params, RequestBody>(
      routeConfig,
      params,
      request,
      (openapi) =>
        handler({
          ...event,
          openapi,
        }),
    );

    const result: APIGatewayProxyStructuredResultV2 = await toResult(response);
    return result;
  };
  return proxyHandler;
}

/**
 * Convert an APIGatewayProxyEventV2 to a [Fetch API Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
 */
function toRequest(event: APIGatewayProxyEventV2): Request {
  const url = new URL(event.rawPath, `https://${event.requestContext.domainName}`);
  url.search = event.rawQueryString;

  const requestInit: RequestInit = {
    method: event.requestContext.http.method,
    headers: new Headers(event.headers as Record<string, string>),
    body: event.body,
  };
  const request = new Request(url, requestInit);
  return request;
}

/**
 * Convert a [Fetch API Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) to an APIGatewayProxyStructuredResultV2
 */
async function toResult(response: Response) {
  const headers = Object.fromEntries(response.headers.entries());
  const body = await response.text();

  const result: APIGatewayProxyStructuredResultV2 = {
    statusCode: response.status,
    headers,
    body,
    isBase64Encoded: false,
  };
  return result;
}
