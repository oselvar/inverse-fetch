import assert from 'node:assert';

import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Callback,
  Context,
} from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import {
  badParams,
  badThing,
  goodParams,
  goodThing,
  respondWithBadTypeParams,
  thingHandler,
  thingRequest,
} from '../test-app/app.js';
import { toProxyHandler } from './index.js';

const context = {} as Context;
const callback: Callback<APIGatewayProxyResultV2> = () => {
  throw new Error('not implemented');
};

describe('proxyHandler', () => {
  it('validates request and response', async () => {
    const event = await toEvent(thingRequest(goodParams, goodThing), goodParams);

    const proxyHandler = toProxyHandler(thingHandler);
    const result = (await proxyHandler(
      event,
      context,
      callback,
    )) as APIGatewayProxyStructuredResultV2;
    expect(JSON.parse(result.body as string)).toEqual(goodThing);
  });

  it('responds with 404 for malformed path params', async () => {
    const event = await toEvent(thingRequest(badParams, goodThing), badParams);

    const proxyHandler = toProxyHandler(thingHandler);
    const result = await proxyHandler(event, context, callback);
    assert(result);
    assert(typeof result !== 'string');
    expect(result.statusCode).toEqual(404);
  });

  it('responds with 422 for malformed request body', async () => {
    const event = await toEvent(thingRequest(goodParams, badThing), goodParams);

    const proxyHandler = toProxyHandler(thingHandler);
    const result = await proxyHandler(event, context, callback);
    assert(result);
    assert(typeof result !== 'string');
    expect(result.statusCode).toEqual(422);
  });

  it('responds with 500 for malformed response body', async () => {
    const event = await toEvent(
      thingRequest(respondWithBadTypeParams, goodThing),
      respondWithBadTypeParams,
    );

    const proxyHandler = toProxyHandler(thingHandler);
    const result = await proxyHandler(event, context, callback);
    assert(result);
    assert(typeof result !== 'string');
    expect(result.statusCode).toEqual(500);
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
