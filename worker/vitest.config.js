import { defineConfig } from 'vitest/config';

// The browser suite's setup accesses window. Keep Worker tests in a separate
// Node project so the platform Headers/Request/Response implementations are used.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['worker/**/*.check.js'],
  },
});
