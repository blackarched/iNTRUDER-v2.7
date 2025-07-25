module.exports = {
  testEnvironment: 'node',
  verbose: true,
  modulePaths: ['<rootDir>/node_modules'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};