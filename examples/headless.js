// You must install node-canvas-webgl to use the headless examples.
try { require('node-canvas-webgl') } catch (e) { throw Error('node-canvas-webgl is not installed, you can install it with `npm install PrismarineJS/node-canvas-webgl`') }

const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').headless

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.once('spawn', async () => {
  // Record 10 seconds at 512x512, 20 fps, to output.mp4
  const recording = mineflayerViewer(bot, { output: 'output.mp4', width: 512, height: 512, fps: 20 })
  if (!recording) throw Error(`no assets for ${bot.version}`)
  await recording.ready
  bot.setControlState('jump', true)
  setTimeout(async () => {
    await recording.stop()
    console.log('saved output.mp4')
    bot.quit()
  }, 10000)
})
