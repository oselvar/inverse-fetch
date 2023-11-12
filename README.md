# fetch-openapi-handler

*Fetch OpenAPI Handler* is a library that lets you write server side HTTP handlers using the Fetch API's [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects.

It lets you run your HTTP handlers in a variety of environments, including:
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Astro](https://astro.build)
- ...and more! (if you write an adapter)

*Fetch OpenAPI Handler* validates HTTP requests and responses against an [OpenAPI 3.0](https://swagger.io/specification/) specification. It can also generate an OpenAPI 3.0 specification from [Zod].


