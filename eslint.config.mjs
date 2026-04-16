import nxPlugin from '@nx/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const boundaryRule = [
  'error',
  {
    enforceBuildableLibDependency: false,
    allow: [],
    depConstraints: [
      {
        sourceTag: 'scope:platform',
        onlyDependOnLibsWithTags: ['scope:platform'],
      },
      {
        sourceTag: 'domain:inventory',
        onlyDependOnLibsWithTags: ['scope:platform', 'domain:inventory'],
      },
      {
        sourceTag: 'domain:sales',
        onlyDependOnLibsWithTags: ['scope:platform', 'domain:sales', 'domain:inventory'],
      },
    ],
  },
];

export default [
  {
    ignores: ['node_modules/**', '_bmad/**', '_bmad-output/**'],
  },
  ...nxPlugin.configs['flat/base'],
  {
    files: ['packages/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@nx/enforce-module-boundaries': boundaryRule,
    },
  },
  {
    files: ['packages/platform/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@forge/sales', '@forge/sales/*', '@forge/inventory', '@forge/inventory/*'],
              message: 'Platform code must not depend on module-owned code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/modules/inventory/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@forge/sales', '@forge/sales/*'],
              message: 'Inventory must not depend on Sales.',
            },
          ],
        },
      ],
    },
  },
];
