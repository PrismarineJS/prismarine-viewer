const mineflayer = require('mineflayer')
const mineflayerViewer = require('../')

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.loadPlugin(mineflayerViewer)
