import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@forge/platform/lookup-runtime': fileURLToPath(new URL('./packages/platform/src/lookup-runtime/index.ts', import.meta.url)),
      '@forge/platform/runtime-definition': fileURLToPath(new URL('./packages/platform/src/runtime-definition/index.ts', import.meta.url)),
      '@forge/platform/transaction-grid': fileURLToPath(new URL('./packages/platform/src/transaction-grid/index.ts', import.meta.url)),
      '@forge/platform': fileURLToPath(new URL('./packages/platform/src/index.ts', import.meta.url)),
      '@forge/sales/lookups': fileURLToPath(new URL('./packages/modules/sales/src/lookups/index.ts', import.meta.url)),
      '@forge/sales': fileURLToPath(new URL('./packages/modules/sales/src/index.ts', import.meta.url)),
      '@forge/inventory/lookups': fileURLToPath(new URL('./packages/modules/inventory/src/lookups/index.ts', import.meta.url)),
      '@forge/inventory': fileURLToPath(new URL('./packages/modules/inventory/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/*.test.ts'],
  },
});
