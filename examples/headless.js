const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').headless

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.once('spawn', () => {
  mineflayerViewer(bot, { frames: 200, width: 512, height: 512 })
  bot.setControlState('jump', true)
})
