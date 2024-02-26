const mineflayer = require('mineflayer')
const mineflayerViewer = require('../').mineflayer

const bot = mineflayer.createBot({
  username: 'Bot',
  host: 'node2.meowbot.de',
  port: 5000,
  version: '1.16.5'
})

bot.once('spawn', async () => {
  mineflayerViewer(bot, { port: 3000 })

  await bot.waitForTicks(20)
  bot.chat('test')
  await bot.waitForTicks(20)
  bot.chat('test')

  bot.viewer.on('onRender', (fps) => {
    console.log(`FPS: ${fps}`)
  })

  const path = [bot.entity.position.clone()]
  bot.on('move', () => {
    if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
      path.push(bot.entity.position.clone())
      bot.viewer.drawLine('path', path)
    }
  })
})
