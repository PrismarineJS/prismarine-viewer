const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalXZ } = require('mineflayer-pathfinder').goals

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  mineflayerViewer(bot, { firstPerson: true, port: 3000 })

  const path = [bot.entity.position.clone()]
  bot.on('move', () => {
    if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
      path.push(bot.entity.position.clone())
      bot.viewer.drawLine('path', path)
    }
  })

  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)
  bot.pathfinder.setMovements(defaultMove)
  bot.pathfinder.setGoal(new GoalXZ(1000, 0))
})
