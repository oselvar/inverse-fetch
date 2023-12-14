import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // We can't run tests in parallel because we're starting a server on the same port
    pool: 'forks',
    coverage: {
      provider: 'v8',
    },
  },
});
