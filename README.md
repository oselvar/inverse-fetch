# fetch-openapi-handler

*Fetch OpenAPI Handler* is a library that simplifies validation of HTTP requests and responses against an OpenAPI 3.0 specification.

It is designed to be used with multiple web servers and currently supports:

* [AWS Lambda](https://aws.amazon.com/lambda/)
* [Astro](https://astro.build/)
* [Remix](https://remix.run/)

Coming soon:

* [Express](https://expressjs.com/)
* [Fastify](https://www.fastify.io/)

## Installation

```bash
npm install --save fetch-openapi-handler
```

## Usage

There are three main steps:
1. Define an OpenAPI route
2. Write a handler function
3. Register the handler function with your HTTP server

### Define an OpenAPI route

```typescript
import { FetchOpenAPIHandler } from 'fetch-openapi-handler';
import { RouteConfig } from '@asteasolutions/zod-to-openapi';

// Define an OpenAPI route using https://github.com/asteasolutions/zod-to-openapi
const routeConfig: RouteConfig = {
  method: 'post',
  path: '/things/{thingId}',
  // more properties...
}
```

### Write a handler function

```typescript
import { FetchRoute } from 'fetch-openapi-handler';

export const fetchRoute: FetchRoute = async ({ params, request }) => {
  // If the params are not valid, a 404 Response will be thrown
  // If the request body is not valid, a 422 Response will be thrown
  const { params, body, respond } = await makeOpenAPI<ThingParams, ThingBody>(routeConfig, params, request);

  // Do something with params and body

  const responseBody = { message: 'Hello, world!' };
  // If the response body is not valid, a 500 Response will be returned
  return respond(responseBody, 200);
};
```

If you are using a framework that already uses `Request` and `Response` such as [Astro](https://astro.build/), you can use the `makeOpenAPI` function to convert the request and response to the format expected by `fetch-openapi-handler`.

```typescript
import type { APIContext, APIRoute } from 'astro';

export const fetchRoute: APIRoute = async (context: APIContext) => {
  const { params, body, respond } = await makeOpenAPI<ThingParams, ThingBody>(routeConfig, context.params, context.request);

  const responseBody = { message: 'Hello, world!' };
  return respond(responseBody, 200);
};
```

### Register the handler function

Convert the handler function to a function that can be registered with your HTTP server.

Note that the support for multiple HTTP servers can also simplify your developer experience.
You can write your handler function once and then register it with multiple HTTP servers.

For example, you can register your handler functions with Express or Fastify during development and then register them with AWS Lambda during production.

#### AWS Lambda

```typescript
import { FetchOpenAPIHandler } from 'fetch-openapi-handler';
import { toProxyHandler } from 'fetch-openapi-handler/aws-lambda';

export const handler = toProxyHandler(fetchRoute);
```

#### Astro

```typescript
import { FetchOpenAPIHandler } from 'fetch-openapi-handler';
import { toProxyHandler } from 'fetch-openapi-handler/aws-lambda';

export const handler = toProxyHandler(fetchRoute);
```