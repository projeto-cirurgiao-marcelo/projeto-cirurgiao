import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config — apenas tests unitarios de `src/lib/**`.
 *
 * Tests e2e (Playwright) ficam em `e2e/` e tem seu proprio runner
 * (`npm run test:e2e`). Excluimos `e2e/` aqui pra nao conflitar.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'e2e', '.next'],
    globals: false,
  },
});
