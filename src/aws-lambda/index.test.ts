import { describe, it, expect } from 'vitest';
import { Thing, ThingParams, thingRouteConfig } from '../index.test';
import { z } from 'zod';
import { openAPIHandler } from './index.js';
import {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Callback,
  Context,
} from 'aws-lambda';

const context: Partial<Context> = {};
const callback: Callback<APIGatewayProxyResultV2> = () => {
  throw new Error('not implemented');
};

describe('openAPIHandler', () => {
  it('validates request and response', async () => {
    const params: z.infer<typeof ThingParams> = {
      thingId: '1',
    };

    const thing: z.infer<typeof Thing> = {
      name: 'My thing',
      description: 'The best thing ever',
    };

    const handler = openAPIHandler(thingRouteConfig, async ({ openapi }) => {
      const { body, respond } = openapi;
      return respond(body, 200);
    });

    // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
    const event: Partial<APIGatewayProxyEventV2> = {
      rawPath: '/things/1',
      pathParameters: params,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(thing),
      requestContext: {
        domainName: 'localhost',
        http: {
          method: 'post',
          path: '/things/1',
          protocol: 'HTTP/1.1',
          sourceIp: 'ignore',
          userAgent: 'ignore',
        },
      } as APIGatewayEventRequestContextV2,
    };

    const result = (await handler(
      event as APIGatewayProxyEventV2,
      context as Context,
      callback,
    )) as APIGatewayProxyStructuredResultV2;
    expect(JSON.parse(result.body as string)).toEqual(thing);
  });
});
