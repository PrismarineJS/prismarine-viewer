const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').headless

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.once('spawn', () => {
  // Stream frames over tcp to a server listening on port 8089, ends when the application stop
  const client = mineflayerViewer(bot, { output: '127.0.0.1:8089', frames: -1, width: 512, height: 512 })
  bot.setControlState('jump', true)

  client.on('data', (data) => {
    const key = parseInt(data.toString(), 10)
    // console.log(key)
    bot.clearControlStates()
    if (key === 32) { // space
      bot.setControlState('jump', true)
    } else if (key === 81) { // left arrow
      bot.entity.yaw += 0.1
    } else if (key === 82) { // top arrow
      bot.setControlState('forward', true)
    } else if (key === 83) { // right arrow
      bot.entity.yaw -= 0.1
    } else if (key === 84) { // down arrow
      bot.setControlState('back', true)
    }
  })
})
