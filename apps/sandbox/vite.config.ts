import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@forge/platform/transaction-grid',
        replacement: fileURLToPath(new URL('../../packages/platform/src/transaction-grid/index.ts', import.meta.url)),
      },
      {
        find: '@forge/platform/transaction-shell',
        replacement: fileURLToPath(new URL('../../packages/platform/src/transaction-shell/index.ts', import.meta.url)),
      },
      {
        find: '@forge/platform/runtime-definition',
        replacement: fileURLToPath(new URL('../../packages/platform/src/runtime-definition/index.ts', import.meta.url)),
      },
      {
        find: '@forge/platform/lookup-runtime',
        replacement: fileURLToPath(new URL('../../packages/platform/src/lookup-runtime/index.ts', import.meta.url)),
      },
      {
        find: '@forge/platform',
        replacement: fileURLToPath(new URL('../../packages/platform/src/index.ts', import.meta.url)),
      },
      {
        find: '@forge/sales/lookups',
        replacement: fileURLToPath(new URL('../../packages/modules/sales/src/lookups/index.ts', import.meta.url)),
      },
      {
        find: '@forge/sales/transactions',
        replacement: fileURLToPath(new URL('../../packages/modules/sales/src/transactions/index.ts', import.meta.url)),
      },
      {
        find: '@forge/sales/ui',
        replacement: fileURLToPath(new URL('../../packages/modules/sales/src/ui/index.ts', import.meta.url)),
      },
      {
        find: '@forge/sales',
        replacement: fileURLToPath(new URL('../../packages/modules/sales/src/index.ts', import.meta.url)),
      },
      {
        find: '@forge/inventory/lookups',
        replacement: fileURLToPath(new URL('../../packages/modules/inventory/src/lookups/index.ts', import.meta.url)),
      },
      {
        find: '@forge/inventory',
        replacement: fileURLToPath(new URL('../../packages/modules/inventory/src/index.ts', import.meta.url)),
      },
    ],
  },
});
