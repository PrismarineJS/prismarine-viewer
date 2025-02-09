module.exports = {
  preset: 'jest-puppeteer',
  testRegex: './*\\.test\\.js$',
  testEnvironmentOptions: require('./jest-puppeteer.config.js'),
  testEnvironment: 'jest-environment-puppeteer'
}
