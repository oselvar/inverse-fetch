import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import fg from 'fast-glob';
import path from 'path';
import * as yaml from 'yaml';

import { registry } from '../src/test-app/registry.js';

const __dirname = new URL('.', import.meta.url).pathname;
const routeGlob = './src/test-app/**/*.ts';

const routeFiles = (await fg(routeGlob)).sort();
for (const routeFile of routeFiles) {
  const importPath = path.relative(__dirname, routeFile);
  console.error(`Importing ${importPath}`);
  await import(importPath);
}
// console.error(registry.definitions)
const generator = new OpenApiGeneratorV3(registry.definitions);

export function generateOpenApi() {
  return generator.generateDocument({
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
}

switch (process.env.OUTPUT) {
  case 'ts':
    console.log(`import type { OpenAPIObject } from 'openapi3-ts/oas31';

export const openapi: OpenAPIObject = ${JSON.stringify(generateOpenApi(), null, 2)}`);
    break;
  case 'json':
    console.log(JSON.stringify(generateOpenApi(), null, 2));
    break;
  case 'yaml':
    console.log(yaml.stringify(generateOpenApi(), null, 2));
    break;
  default:
    console.error('Invalid OUTPUT environment variable');
    process.exit(1);
}
