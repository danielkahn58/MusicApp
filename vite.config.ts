/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

// BASE_PATH lets the app be deployed under a sub-path (e.g. GitHub Pages
// project sites at https://user.github.io/repo/) without code changes.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
