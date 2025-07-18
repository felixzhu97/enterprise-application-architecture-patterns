import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.(test|spec).ts', 'src/**/*.(test|spec).ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.d.ts',
      'src/__tests__/setup.ts',
      'src/__tests__/helpers/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/app.ts',
        'src/infrastructure/database/migrations/**',
        'src/infrastructure/database/seeds/**',
        'src/__tests__/**'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@data': path.resolve(__dirname, './src/data'),
      '@web': path.resolve(__dirname, './src/web'),
      '@distribution': path.resolve(__dirname, './src/distribution'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@patterns': path.resolve(__dirname, './src/patterns')
    }
  }
});