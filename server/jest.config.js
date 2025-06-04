module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'], // Pattern for test files
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Setup a file to load environment variables or other global setup for tests
  // setupFiles: ['./src/__tests__/setupEnv.ts'], // Optional: if needed for JWT_SECRET
};
