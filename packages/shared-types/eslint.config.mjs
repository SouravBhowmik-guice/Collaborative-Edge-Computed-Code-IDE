import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';

export default [
  { ignores: ['dist/', 'node_modules/', '*.config.*'] },
  ...tsPlugin.configs.recommended,
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];