const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').headless

const bot = mineflayer.createBot({
  username: 'Bot'
})

const streamServer = 'cdg.contribute.live-video.net' // see https://stream.twitch.tv/ingests for list, choose the closest to you
const streamKey = '' // your streaming key

bot.once('spawn', () => {
  mineflayerViewer(bot, { output: `rtmp://${streamServer}/app/${streamKey}`, width: 1280, height: 720, logFFMPEG: true })
  bot.setControlState('jump', true)
})
