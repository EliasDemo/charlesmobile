/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^@test/(.*)$': '<rootDir>/test/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts', '!src/shared/api/generated/**'],
  coverageThreshold: {
    './src/shared/api/': { statements: 80, branches: 80, functions: 80, lines: 80 },
    './src/shared/payments/': { statements: 80, branches: 80, functions: 80, lines: 80 },
    './src/features/auth/hooks/': { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
