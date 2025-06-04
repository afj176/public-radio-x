module.exports = {
  extends: [
    '../../.eslintrc.js', // Extends the root ESLint configuration
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Make sure this is after airbnb-base and @typescript-eslint/recommended
  ],
  plugins: ['@typescript-eslint', 'import'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json', // Path to your server's tsconfig.json
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // Add or override server-specific rules here
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/prefer-default-export': 'off', // Personal preference
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
