/* eslint-env jest */
/* global page */

const supportedVersions = require('../').supportedVersions
const fs = require('fs')

const path = require('path')
const MC_SERVER_PATH = path.join(__dirname, 'server')
const os = require('os')

const Wrap = require('minecraft-wrap').Wrap

const { getPort } = require('./common/util')

const download = require('minecraft-wrap').download
const TIMEOUT = 5 * 60 * 1000
const TIMEOUT_SCREENSHOT = 2 * 60 * 1000

supportedVersions.forEach(function (supportedVersion) {
  let PORT = null
  const mcData = require('minecraft-data')(supportedVersion)
  const version = mcData.version
  const MC_SERVER_JAR_DIR = process.env.MC_SERVER_JAR_DIR || os.tmpdir()
  const MC_SERVER_JAR = MC_SERVER_JAR_DIR + '/minecraft_server.' + version.minecraftVersion + '.jar'
  const wrap = new Wrap(MC_SERVER_JAR, MC_SERVER_PATH + '_' + supportedVersion, {
    minMem: 1024,
    maxMem: 1024
  })
  wrap.on('line', function (line) {
    console.log(line)
  })

  describe('client ' + version.minecraftVersion, function () {
    beforeAll(async () => {
      await new Promise(resolve => download(version.minecraftVersion, MC_SERVER_JAR, resolve))
      PORT = await getPort()
    }, TIMEOUT)

    afterAll(function (done) {
      wrap.deleteServerData(function (err) {
        if (err) { console.log(err) }
        done(err)
      })
    }, TIMEOUT)

    describe('offline', function () {
      beforeAll(function (done) {
        console.log(new Date() + 'starting server ' + version.minecraftVersion)
        wrap.startServer({
          'online-mode': 'false',
          'server-port': PORT,
          motd: 'test1234',
          'max-players': 120
        }, function (err) {
          if (err) { console.log(err) }
          console.log(new Date() + 'started server ' + version.minecraftVersion)
          done(err)
        })
      }, TIMEOUT)

      afterAll(function (done) {
        console.log(new Date() + 'stopping server' + version.minecraftVersion)
        wrap.stopServer(function (err) {
          if (err) { console.log(err) }
          console.log(new Date() + 'stopped server ' + version.minecraftVersion)
          done(err)
        })
      }, TIMEOUT)

      it('doesn\'t crash', function (done) {
        console.log('test')
        done()
      })

      it('starts the viewer', function (done) {
        const mineflayer = require('mineflayer')
        const mineflayerViewer = require('../').mineflayer
        setTimeout(() => done(new Error('too slow !!!')), TIMEOUT)

        const bot = mineflayer.createBot({
          username: 'Bot',
          port: PORT,
          version: supportedVersion
        })

        bot.once('spawn', () => {
          mineflayerViewer(bot, { port: 3000 })

          function exit (err) {
            bot.viewer.close()
            bot.end()
            done(err)
          }

          page.goto('http://localhost:3000').then(() => {
            // https://github.com/puppeteer/puppeteer/issues/3397
            page.on('console', async (message) => {
              let toPrint = ''
              if (message.text() !== 'JSHandle@error') {
                toPrint = `${message.type().substring(0, 3).toUpperCase()} ${message.text()}`
              } else {
                const messages = await Promise.all(message.args().map((arg) => {
                  return arg.getProperty('message')
                }))

                toPrint = `${message.type().substring(0, 3).toUpperCase()} ${messages.filter(Boolean)}`
              }
              if (!toPrint.includes('Unknown entity')) {
                console.log(toPrint)
              }
            })

            page.on('error', err => {
              exit(err)
            })

            page.on('pageerror', pageerr => {
              exit(pageerr)
            })
            setTimeout(() => {
              const fileName = path.join(__dirname, `test_${supportedVersion}.png`)
              page.screenshot({ path: fileName }).then(() => {
                const fileSize = fs.statSync(fileName).size
                if (fileSize < 100000) {
                  exit(new Error(`The file size of ${fileName} is ${fileSize}. This is less than 100KB, and is likely an empty render.`))
                } else {
                  exit()
                }
              }).catch(err => exit(err))
            }, TIMEOUT_SCREENSHOT)
          }).catch(err => exit(err))
        })
      }, TIMEOUT)
    })
  })
})
