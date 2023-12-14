import path from 'node:path';

import fg from 'fast-glob';

const __dirname = new URL('.', import.meta.url).pathname;

export async function fbr(routeGlob: string) {
  const routeFiles = (await fg(routeGlob)).sort();
  for (const routeFile of routeFiles) {
    const importPath = path.relative(__dirname, routeFile);
    console.error(`Importing ${importPath}`);
    await import(importPath);
  }
}
