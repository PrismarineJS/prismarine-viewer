const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const bot = mineflayer.createBot({
  username: 'Bot',
  host: process.argv[2],
  port: isNaN(parseInt(process.argv[3])) ? 25565 : parseInt(process.argv[3]),
  version: process.argv[4] ?? '1.16.5'
})

bot.once('spawn', async () => {
  mineflayerViewer(bot, { port: 3000 })

  const path = [bot.entity.position.clone()]
  bot.on('move', () => {
    if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
      path.push(bot.entity.position.clone())
      bot.viewer.drawLine('path', path)
    }
  })
})
