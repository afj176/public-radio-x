module.exports = {
  extends: [
    '../../.eslintrc.js', // Extends the root ESLint configuration
    'airbnb',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Make sure this is after other configs
  ],
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'import'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json', // Path to your client's tsconfig.json
    tsconfigRootDir: __dirname,
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    react: {
      version: 'detect', // Automatically detects the React version
    },
  },
  rules: {
    // Add or override client-specific rules here
    'react/jsx-filename-extension': [
      1,
      { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    ],
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
    'react/react-in-jsx-scope': 'off', // Not needed for Expo/React Native
    'react/prop-types': 'off', // Not using prop-types as we are using TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'import/prefer-default-export': 'off', // Personal preference
  },
};
