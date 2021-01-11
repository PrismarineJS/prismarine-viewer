/* global THREE */

const { spawn } = require('child_process')
const net = require('net')
global.THREE = require('three')
global.Worker = require('worker_threads').Worker
const { createCanvas } = require('node-canvas-webgl/lib')

const { WorldView, Viewer, getBufferFromStream } = require('../viewer')

module.exports = (bot, { viewDistance = 6, output = 'output.mp4', frames = 200, width = 512, height = 512 }) => {
  const canvas = createCanvas(width, height)
  const renderer = new THREE.WebGLRenderer({ canvas })
  const viewer = new Viewer(renderer)

  viewer.setVersion(bot.version)
  viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)

  // Load world
  const worldView = new WorldView(bot.world, viewDistance, bot.entity.position)
  viewer.listen(worldView)
  worldView.init(bot.entity.position)

  function botPosition () {
    viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
    worldView.updatePosition(bot.entity.position)
  }

  // Render loop streaming
  const ffmpegOutput = output.endsWith('mp4')
  let client = null

  if (ffmpegOutput) {
    client = spawn('ffmpeg', ['-y', '-i', 'pipe:0', output])
    update()
  } else {
    const [host, port] = output.split(':')
    client = new net.Socket()
    client.connect(parseInt(port, 10), host, () => {
      update()
    })
  }

  // Force end of stream
  bot.on('end', () => { frames = 0 })

  let idx = 0
  function update () {
    renderer.render(viewer.scene, viewer.camera)

    const imageStream = canvas.createJPEGStream({
      bufsize: 4096,
      quality: 100,
      progressive: false
    })

    if (ffmpegOutput) {
      imageStream.on('data', (chunk) => {
        if (client.stdin.writable) {
          client.stdin.write(chunk)
        } else {
          console.log('Error: ffmpeg stdin closed!')
        }
      })
      imageStream.on('end', () => {
        idx++
        if (idx < frames || frames < 0) {
          setTimeout(update, 16)
        } else {
          console.log('done streaming')
          client.stdin.end()
        }
      })
      imageStream.on('error', () => { })
    } else {
      getBufferFromStream(imageStream).then((buffer) => {
        const sizebuff = new Uint8Array(4)
        const view = new DataView(sizebuff.buffer, 0)
        view.setUint32(0, buffer.length, true)
        client.write(sizebuff)
        client.write(buffer)

        idx++
        if (idx < frames || frames < 0) {
          setTimeout(update, 16)
        } else {
          client.end()
        }
      }).catch(() => {})
    }
  }

  // Register events
  bot.on('move', botPosition)
  worldView.listenToBot(bot)

  return client
}
