import {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Callback,
  Context,
} from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { goodParams, goodThing, thingRequest, thingRouteConfig } from '../test_helpers.js';
import { openAPIHandler } from './index.js';

const context: Partial<Context> = {};
const callback: Callback<APIGatewayProxyResultV2> = () => {
  throw new Error('not implemented');
};

describe('openAPIHandler', () => {
  it('validates request and response', async () => {
    const handler = openAPIHandler(thingRouteConfig, async ({ openapi }) => {
      const { body, respond } = openapi;
      return respond(body, 200);
    });

    const event = await toEvent(thingRequest(goodParams), goodParams);

    const result = (await handler(
      event as APIGatewayProxyEventV2,
      context as Context,
      callback,
    )) as APIGatewayProxyStructuredResultV2;
    expect(JSON.parse(result.body as string)).toEqual(goodThing);
  });
});

async function toEvent(
  request: Request,
  params: Record<string, string>,
): Promise<APIGatewayProxyEventV2> {
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
  const url = new URL(request.url);
  const event: Partial<APIGatewayProxyEventV2> = {
    pathParameters: params,
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    requestContext: {
      domainName: url.hostname,
      http: {
        method: request.method,
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: 'ignore',
        userAgent: 'ignore',
      },
    } as APIGatewayEventRequestContextV2,
  };
  return event as APIGatewayProxyEventV2;
}
