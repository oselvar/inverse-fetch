# openapi-routes

*OpenAPI Routes* is a small library that validates HTTP requests and responses against an OpenAPI 3.0 specification.

It is designed to work with any web servers/framework that uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) such as:

* [Cloudflare Workers](https://developers.cloudflare.com/workers/)
* [Astro](https://astro.build/)
* [Remix](https://remix.run/)

It also provides adapters for non-Fetch based web servers/frameworks such as:

* [AWS Lambda](https://aws.amazon.com/lambda/)
* [Express](https://expressjs.com/) (coming soon)
* [Fastify](https://www.fastify.io/) (coming soon)

OpenAPI Routes is built on top of [Zod](https://zod.dev/) and [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi). Rather than writing OpenAPI specifications by hand, you write Zod schemas and then generate OpenAPI specifications from them.

## Installation

```bash
npm install --save fetch-openapi-handler
```

## Usage

There are two or three steps, depending on your web server:

1. Define an OpenAPI route
2. Write a handler function
3. Register the handler function (if you're using a web server that does not use the Fetch API)

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

If you are using a framework that does *not* use the Fetch API [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects
such as [AWS Lambda](https://aws.amazon.com/lambda/), [Express](https://expressjs.com/) or [Fastify](https://www.fastify.io/), use the `FetchRoute` type to define your handler function:

```typescript
import { FetchRoute } from 'fetch-openapi-handler';

export const fetchRoute: FetchRoute = async ({ params, request }) => {
  // If the params are not valid, a 404 Response will be thrown
  // If the request body is not valid, a 422 Response will be thrown
  const { params, body, respond } = await makeOpenAPI<ThingParams, ThingBody>(
    routeConfig, 
    params, 
    request
  );

  // Do something with params and body

  const responseBody = { message: 'Hello, world!' };
  // If the response body is not valid, a 500 Response will be returned
  return respond(responseBody, 200);
};
```

The `FetchRoute` handler can then be registered with your HTTP server (see below).

If you are using a framework that *does use* `Request` and `Response` such as [Astro](https://astro.build/) or [Remix](https://remix.run/), you can write your handler using the framework's API and still use the `makeOpenAPI` function.

The following example uses [Astro API Routes](https://docs.astro.build/en/core-concepts/endpoints/#server-endpoints-api-routes):

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async (context) => {
  const { params, body, respond } = await makeOpenAPI<ThingParams, ThingBody>(
    routeConfig, 
    context.params, 
    context.request
  );

  const responseBody = { message: 'Hello, world!' };
  return respond(responseBody, 200);
};
```

### Register the handler function

*This section is for web servers that do not use the Fetch API.*

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

#### Express

Coming soon.

#### Fastify

Coming soon.