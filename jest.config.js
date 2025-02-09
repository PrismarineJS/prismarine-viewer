module.exports = {
  preset: 'jest-puppeteer',
  testRegex: './*\\.test\\.js$',
  testEnvironment: 'jest-environment-puppeteer',
  testEnvironmentOptions: {
    headless: true
  }
};
