module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'no-console': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/'],
};
