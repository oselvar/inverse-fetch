import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import * as yaml from 'yaml';

import { importEndpoints } from '../src/file-based-routing/index.js';
import { routeDir } from '../src/test-app/app.js';
import { registry } from '../src/test-app/registry.js';

const endpoints = await importEndpoints(routeDir);
for (const { route } of endpoints) {
  if (route) {
    registry.registerPath(route);
  }
}
const generator = new OpenApiGeneratorV3(registry.definitions);

const openapi = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Example API',
    version: '0.1.0',
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
});

switch (process.env.OUTPUT) {
  case 'ts':
    console.log(`import type { OpenAPIObject } from 'openapi3-ts/oas31';

export const openapi: OpenAPIObject = ${JSON.stringify(openapi, null, 2)}`);
    break;
  case 'json':
    console.log(JSON.stringify(openapi, null, 2));
    break;
  case 'yaml':
    console.log(yaml.stringify(openapi, null, 2));
    break;
  default:
    console.error('Invalid OUTPUT environment variable');
    process.exit(1);
}
