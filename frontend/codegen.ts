import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: '../backend/schema.graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/generated/**'],
  ignoreNoDocuments: true,
  generates: {
    'src/generated/types.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        scalars: {
          Date: 'string',
        },
      },
    },
    'src/generated/operations.ts': {
      plugins: ['typescript-operations'],
      config: {
        importTypesFrom: './types',
        dedupeOperationSuffix: true,
        enumsAsTypes: true,
        scalars: {
          Date: 'string',
        },
      },
    },
  },
}

export default config
