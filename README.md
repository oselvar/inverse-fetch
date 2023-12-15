Inverse Fetch uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to define HTTP handlers on the server.

![inverse-fetch.svg](doc/inverse-fetch.svg)

By using the Fetch API to define routes we get some powerful benefits

- [Example](#example)
- [Why?](#why)
- [Local development](#local-development)
- [Ultra-fast integration tests](#ultra-fast-integration-tests)
- [Mounting handlers in your web framework](#mounting-handlers-in-your-web-framework)
  - [File based routing](#file-based-routing)
- [Helpers](#helpers)
  - [Path parameters](#path-parameters)
- [Benchmarks](#benchmarks)
  
## Example

The obligatory "Hello World" example:

```typescript
// ./routes/hello.ts
// FetchHandler is an alias for `typeof fetch`
export const handler: FetchHandler = async (input) => {
  return new Response(`Hello World`)
}
```

Your `FetchHandler`s can be mounted in several different web frameworks using *file based routing*:

```typescript
// Express
import express from 'express'
import { addRoutes } from '@oselvar/inverse-fetch/express'

app = express();
await addRoutes(app, './routes');
```

```typescript
// AWS Lambda
import { toAwsLambdaHandler } from '@oselvar/inverse-fetch/aws-lambda'
import { handler as fetchHandler } from './handler'

export const handler = toAwsLambdaHandler({ handler })
```

## Why?

You might ask yourself why we need another convention for defining HTTP routes. After all, every JavaScript web framework has its *own way* of defining routes.

```typescript
// Express
app.get('/hello', (req, res) => {
  res.send('Hello World')
})
```

```typescript
// AWS Lambda
export const handler = async (event) => {
  return {
    statusCode: 200,
    body: 'Hello World',
  }
}
```

```typescript
// Fastify
fastify.get('/hello', async (request, reply) => {
  return 'Hello World'
})
```

All of these web frameworks have one thing in common: 
*They all have their own proprietary way of defining routes.*

Architecture changes *do* happen. You might start out with one web framework, and for various reasons (scaling, company politics etc) you might want to switch to another one.

If you have a lot of routes, this can be a lot of work. You have to rewrite all your routes to the new framework.

With Inverse Fetch, you can define your routes using the Fetch API. This means that you can switch to another web framework without having to rewrite your routes.

## Local development

For instance, you might be using AWS Lambda during production. While it's possible to emulate AWS Lambda locally, you have to endure a very long delay between each change to your code. 

By using a web framework such as Express or Fastify during development, you can get instant feedback on your changes.

## Ultra-fast integration tests

Another use case is integration testing your JavaScript client and your server.

If your client uses the Fetch API, you can call your handler directly from the client. After all, the handler has exactly the same interface as `fetch`.

This allows you to write integration tests that can run in milliseconds.

## Mounting handlers in your web framework

The `inverse-fetch` module provides utilities for mounting your handlers in your web framework.
You can choose between file based routing or a more traditional approach where you mount handlers with code.

### File based routing

With file based routing, you must follow the following conventions:

* One file per handler
* The file name must be `GET.ts`, `POST.ts` etc.
* The file **must** export a `handler` function
* The file **may** export a `route` object for OpenAPI documentation and validation

## Helpers

The `fetch` API is fairly low-level. The `FetchHandler` is passed an `input` object which may be of type `string`, `Request` or `URL`,
A fair amount of type checking is required before you can extract values such as the request body, path parameters etc.

To make this easier, the `inverse-fetch` module provides a `FetchHelper` class that wraps the `input` and `init` arguments:

```typescript
// Inverse Fetch uses path patterns where path parameters are wrapped in curly braces.
// This is different from the Express convention where path parameters are prefixed with a colon.
// This is also used for file based routing.
const pathPattern = '/hello/{name}'

export const handler: FetchHandler = async (input) => {
  const helper = new FetchHelper(input, pathPattern)
  const params = helper.params()
  return helper.respond(new Response(`Hello World`))
}
```

### Path parameters

```typescript
```

## Benchmarks

The various web framework adapters for Inverse Fetch convert incoming requests to a Fetch API `Request` object,
and then convert the `Response` object returned by the handler to the appropriate response format.

This has a performance cost, but it's not as bad as you might think.