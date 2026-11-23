import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.js', 'config/config.js'],
      exclude: ['src/index.js'],
      thresholds: {
        lines: 75,
        functions: 75,
        statements: 75,
      },
    },
  },
});
