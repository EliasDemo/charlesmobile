// Flat config. The architecture boundaries (CLAUDE.md §3) are enforced with no-restricted-imports.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

const FEATURE_DEEP_IMPORT = {
  group: ['@/features/*/*'],
  message: 'Importa otra funcionalidad solo desde su index.ts (@/features/<nombre>).',
};
const RELATIVE_OUTSIDE_FEATURE = {
  group: ['../../*', '../../../*'],
  message: 'No salgas de la funcionalidad con rutas relativas: usa @/shared/... o @/features/<nombre>.',
};
const DIRECT_FETCH_MESSAGE = 'Usa el cliente de @/shared/api; ninguna pantalla llama a fetch directamente.';

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*', 'src/shared/api/generated/*', 'docs/api/*'],
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // shared/ never depends on features/.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/features/*', '**/features/**'], message: 'shared/ no puede importar de features/.' },
          ],
        },
      ],
    },
  },
  // A feature imports other features only through their index, and never leaves its folder with ../../
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [FEATURE_DEEP_IMPORT, RELATIVE_OUTSIDE_FEATURE] }],
      'no-restricted-globals': ['error', { name: 'fetch', message: DIRECT_FETCH_MESSAGE }],
    },
  },
  // View layer: screens and components talk to hooks, never to the API layer.
  {
    files: ['src/features/*/screens/**/*.{ts,tsx}', 'src/features/*/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@tanstack/react-query', message: 'Las consultas viven en hooks/, no en la vista.' },
          ],
          patterns: [
            FEATURE_DEEP_IMPORT,
            RELATIVE_OUTSIDE_FEATURE,
            {
              group: ['../api', '../api/*'],
              message: 'La vista no llama a la API: usa un hook (pantalla → hook → API).',
            },
            { group: ['@/shared/api/*'], message: 'Usa solo el índice @/shared/api.' },
          ],
        },
      ],
    },
  },
  // Model layer: no React, no UI, no upward imports.
  {
    files: ['src/features/*/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'La capa api/ no depende de React.' },
            { name: 'react-native', message: 'La capa api/ no depende de la interfaz.' },
            { name: '@tanstack/react-query', message: 'Las consultas viven en hooks/.' },
          ],
          patterns: [
            FEATURE_DEEP_IMPORT,
            RELATIVE_OUTSIDE_FEATURE,
            {
              group: [
                '../hooks',
                '../hooks/*',
                '../screens',
                '../screens/*',
                '../components',
                '../components/*',
              ],
              message: 'La dirección es pantalla → hook → API, nunca al revés.',
            },
            { group: ['@/shared/ui', '@/shared/ui/*'], message: 'La capa api/ no depende de la interfaz.' },
          ],
        },
      ],
    },
  },
  // ViewModel layer: hooks never import views.
  {
    files: ['src/features/*/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            FEATURE_DEEP_IMPORT,
            RELATIVE_OUTSIDE_FEATURE,
            {
              group: ['../screens', '../screens/*', '../components', '../components/*'],
              message: 'Los hooks no importan vistas.',
            },
          ],
        },
      ],
    },
  },
  // Routes only delegate to features (through their index) and shared.
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            FEATURE_DEEP_IMPORT,
            { group: ['@/shared/*/*'], message: 'Importa shared desde su índice (@/shared/<módulo>).' },
            {
              group: ['../*', './*'],
              message: 'app/ solo define rutas: importa desde @/features o @/shared.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: DIRECT_FETCH_MESSAGE }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'plugins/**/*.js', '*.config.js', 'jest.setup.ts'],
    rules: { 'no-console': 'off' },
  },
  // jest.mock factories must use require() and run before the imports they affect.
  {
    files: ['jest.setup.ts', '**/__tests__/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-require-imports': 'off', 'import/first': 'off' },
  },
]);
