module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.ts", // Include all TypeScript files
    "!**/node_modules/**", // Exclude node_modules
    "!**/dist/**", // Exclude build output
    "!**/*.d.ts", // Exclude type declaration files
  ],
  coverageDirectory: "coverage", // Where to store the coverage reports
  coverageReporters: ["text", "lcov", "json", "html"], // Report formats
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
