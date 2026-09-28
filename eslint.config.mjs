// @ts-check
/**
 * Lint config for the app source and the Node-side scripts.
 *
 * Typed linting is on (`projectService`), because the rules worth having here
 * are the ones that need types: a floating promise in the Wikipedia fetch or a
 * comparison that is always true in the lane arithmetic are exactly the bugs
 * that survive a syntax-only pass. The cost is that the config has to tell
 * typescript-eslint which tsconfig owns which file.
 */
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  // --- the app -----------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      // v7 nests the flat-config variants under `configs.flat`; the top-level
      // `recommended` is still the legacy shape and ESLint 10 rejects it.
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // --- the build/verify scripts -----------------------------------------
  // Plain ESM run by node, never bundled, and not covered by the app tsconfig,
  // so they get the untyped pass rather than a parser error.
  {
    files: ['scripts/**/*.mjs', 'eslint.config.mjs', 'vite.config.ts'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
