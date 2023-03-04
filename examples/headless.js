// You must install node-canvas-webgl to use the headless examples.
try { require('node-canvas-webgl') } catch (e) { throw Error('node-canvas-webgl is not installed, you can install it with `npm install PrismarineJS/node-canvas-webgl`') }

const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').headless

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.once('spawn', () => {
  // Record 200 frames, 512x512 pixels, and save them to output.mp4
  mineflayerViewer(bot, { output: 'output.mp4', frames: 200, width: 512, height: 512 })
  bot.setControlState('jump', true)
})
