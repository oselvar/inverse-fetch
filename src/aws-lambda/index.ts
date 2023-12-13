import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Handler,
} from 'aws-lambda';
export type AwsLambdaHandler = Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>;

import type { FetchHandler, ToErrorResponse } from '../index.js';
import { toHttpError, toJsonEerrorResponse } from '../index.js';

export type ToAwsLambdaHandler = {
  handler: FetchHandler;
  toErrorResponse?: ToErrorResponse;
};

export function toAwsLambdaHandler(params: ToAwsLambdaHandler): AwsLambdaHandler {
  const { handler, toErrorResponse = toJsonEerrorResponse } = params;
  return async (event) => {
    // const params = (event.pathParameters || {}) as StringParams;
    try {
      const request = toRequest(event);
      const response = await handler(request);
      return toResult(response);
    } catch (error) {
      const httpError = toHttpError(error);
      const response = toErrorResponse(httpError);
      return toResult(response);
    }
  };
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
  return new Request(url, requestInit);
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
