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
