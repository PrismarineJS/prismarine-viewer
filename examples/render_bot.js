const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const bot = mineflayer.createBot({
  username: 'Bot',
  host: process.argv[2],
  port: isNaN(parseInt(process.argv[3])) ? 25565 : parseInt(process.argv[3]),
  version: process.argv[4] ?? '1.16.5'
})

bot.once('spawn', () => {
  mineflayerViewer(bot, { port: 3000 })

  // approximate maximum FPS of all clients connected to our viewer
  bot.viewer.on('onRender', (fps) => {
    // do something every frame

    // random offset of bot position, +/5 in x and z, +5 in y
    const pos = bot.entity.position.offset(Math.random() * 10 - 5, 5, Math.random() * 10 - 5)

    bot.viewer.erase('posExample')
    bot.viewer.drawBoxGrid('posExample', pos, pos.offset(1, 1, 1), 'aqua')
  })

  const path = [bot.entity.position.clone()]
  bot.on('move', () => {
    if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
      path.push(bot.entity.position.clone())
      bot.viewer.drawLine('path', path)
    }
  })
})
