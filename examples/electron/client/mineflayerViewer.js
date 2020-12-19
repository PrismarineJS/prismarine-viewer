const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

class MineflayerViewer {
  start(props) {
    this.bot = mineflayer.createBot(props)
    const bot = this.bot

    bot.once('spawn', () => {
      mineflayerViewer(bot, { port: 3000 })
    
      const path = [bot.entity.position.clone()]
      bot.on('move', () => {
        if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
          path.push(bot.entity.position.clone())
          bot.viewer.drawLine('path', path)
        }
      })
    })
  }
}