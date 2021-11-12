/* eslint-env mocha */
/* global page */

const expect = require('expect')

describe('Google', () => {
  before(async function () {
    this.timeout(20000)
    await page.goto('https://google.com')
  })

  it('should display "google" text on page', async function () {
    this.timeout(20000)
    await expect(page).toMatch('google')
  })
})
