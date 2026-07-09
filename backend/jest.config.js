export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/payment.test.js", "**/tests/githubExport.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
};
