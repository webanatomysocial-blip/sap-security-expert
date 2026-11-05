import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Generated and vendored output is never linted: Next.js build output, dependencies,
  // coverage and the public static folder. Source code is linted in full.
  globalIgnores(['dist', '.next', 'out', 'coverage', 'node_modules', 'server/node_modules', 'public/**']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['server/**/*.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Backend is CommonJS Node, not the Vite/browser SPA — separate globals
    // and sourceType so `require`/`module`/`process` aren't flagged as undefined.
    files: ['server/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
