This is a small library that validates HTTP requests and responses against an OpenAPI 3.0 specification.

It is designed to work with any web servers/framework that uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) such as:

* [Cloudflare Workers](https://developers.cloudflare.com/workers/)
* [Astro](https://astro.build/)
* [Remix](https://remix.run/)

It also provides adapters for non-Fetch based web servers/frameworks such as:

* [AWS Lambda](https://aws.amazon.com/lambda/)
* [Express](https://expressjs.com/) (coming soon)
* [Fastify](https://www.fastify.io/) (coming soon)

The library is built on top of [Zod](https://zod.dev/) and [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi).

- [Installation](#installation)
- [Define an OpenAPI route](#define-an-openapi-route)
- [Create a validator](#create-a-validator)
- [Validate requests and responses](#validate-requests-and-responses)
- [Error handling](#error-handling)
- [Adapters](#adapters)
  - [AWS Lambda](#aws-lambda)
  - [Express](#express)
  - [Fastify](#fastify)

## Installation

```bash
npm install --save @oselvar/openapi-validator
```

## Define an OpenAPI route

```typescript
import { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  Response404,
  Response415,
  Response422,
  Response500,
} from '@oselvar/openapi-validator';

// Define Zod schemas for the request parameters, query and body

const ThingParamsSchema = z.object({
  thingId: z.string().regex(/[\d]+/),
});

const ThingQuerySchema = z.object({
  thingId: z.string().regex(/[\d]+/).optional(),
});

const ThingBodySchema = z.object({
  name: z.string().regex(/[a-z]+/),
  description: z.string().regex(/[a-z]+/),
});

// Define an OpenAPI route using https://github.com/asteasolutions/zod-to-openapi

const routeConfig: RouteConfig = {
  method: 'post',
  path: '/things/{thingId}',
  request: {
    params: ThingParamsSchema,
    query: ThingQuerySchema,
    body: {
      content: {
        'application/json': {
          schema: ThingBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Create a thing',
      content: {
        'application/json': {
          schema: ThingBodySchema,
        },
      },
    },
    404: Response404,
    415: Response415,
    422: Response422,
    500: Response500,
  },
};
```

## Create a validator

The `Validator` class uses the schemas in the `routeConfig` object to validate requests and responses.

```typescript
import { Validator } from '@oselvar/openapi-validator';

const validator = new Validator(routeConfig);
```

## Validate requests and responses

Your web server will provide a `request` object and a `params` object.

(If your web server does not use the Fetch API, see the [Adapters](#adapters) section below.)

```typescript
const request: Request = ...;
const params: Record<string, string | undefined> = ...;

const params = validator.params<z.infer<typeof ThingParamsSchema>>(params);
const body = await validator.body<z.infer<typeof ThingBodySchema>>(request);
const response = validator.validate(Response.json(body));
```

## Error handling

The methods on the `Validator` object will throw a `ValidationError` if the request or response is invalid.
You must handle this error and return an appropriate HTTP response to the client.

We recommend doing this in a middleware function. Please refer to your web server's documentation for more information.

Here is an example:

```typescript
import { unwrapError } from '@oselvar/openapi-validator';

try {
  // Run the handler
} catch (error) {
  const { message, response } = unwrapError(error);
  console.error(response.status, message);
  return response;
}
```

## Adapters

If you are using a framework that does *not* use the Fetch API [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects
such as [AWS Lambda](https://aws.amazon.com/lambda/), [Express](https://expressjs.com/) or [Fastify](https://www.fastify.io/), use the `FetchRoute` type to define your handler function:

```typescript
import { FetchRoute, Validator } from '@oselvar/openapi-validator';
import { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const routeConfig: RouteConfig = { ... };
const validator = new Validator(routeConfig);

const fetchRoute: FetchRoute = async (context) => {
  const params = validator.params<z.infer<typeof ThingParamsSchema>>(context.params);
  const body = await validator.body<z.infer<typeof ThingBodySchema>>(context.request);
  return validator.validate(Response.json(body));
};
```

Note that the support for multiple HTTP servers can also simplify your developer experience.
You can write your handler function once and then register it with multiple HTTP servers.

For example, you can register your handler functions with Express or Fastify during development and then register them with AWS Lambda during production.

The next step is to convert the `FetchRoute` to a function that can be registered with your HTTP server.

### AWS Lambda

```typescript
import { FetchOpenAPIHandler } from '@oselvar/openapi-validator';
import { toProxyHandler } from '@oselvar/openapi-validator/aws-lambda';

export const handler = toProxyHandler(fetchRoute);
```

### Express

Coming soon.

### Fastify

Coming soon.