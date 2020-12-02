/* global THREE */

const { spawn } = require('child_process')
const net = require('net')
global.THREE = require('three')
global.Worker = require('worker_threads').Worker
const { createCanvas } = require('node-canvas-webgl/lib')

const { Vec3 } = require('vec3')
const { WorldRenderer } = require('../src/worldrenderer')
const { makeTextureAtlas } = require('../lib/atlas')
const { prepareBlocksStates } = require('../lib/models')
const { getBufferFromStream, spiral, chunkPos } = require('./utils')

module.exports = (bot, { viewDistance = 6, output = 'output.mp4', frames = 200, width = 512, height = 512 }) => {
  const mcAssets = require('minecraft-assets')(bot.version)
  const atlas = makeTextureAtlas(mcAssets)
  const blocksStates = prepareBlocksStates(mcAssets, atlas)

  // Make scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('lightblue')

  const ambientLight = new THREE.AmbientLight(0xcccccc)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(1, 1, 0.5).normalize()
  scene.add(directionalLight)

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  setCameraPos()

  const canvas = createCanvas(width, height)
  const renderer = new THREE.WebGLRenderer({ canvas })

  const worldTexture = new THREE.CanvasTexture(atlas.canvas)
  const world = new WorldRenderer(scene, worldTexture)
  world.setBlocksStates(blocksStates)
  world.setVersion(bot.version)

  // Load world
  const [botX, botZ] = chunkPos(bot.entity.position)
  spiral(viewDistance * 2, viewDistance * 2, (x, z) => {
    loadChunk(new Vec3((botX + x) * 16, 0, (botZ + z) * 16))
  })

  function loadChunk (pos) {
    world.addColumn(pos.x, pos.z, bot.world.getColumn(Math.floor(pos.x / 16), Math.floor(pos.z / 16)).toJson())
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

  let idx = 0
  function update () {
    renderer.render(scene, camera)

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

  function setCameraPos () {
    const pos = bot.entity.position
    camera.position.set(pos.x, pos.y + 1.6, pos.z)
    camera.rotation.set(bot.entity.pitch, bot.entity.yaw, 0, 'ZYX')
  }

  // Register events
  bot.on('move', setCameraPos)

  bot.on('chunkColumnLoad', loadChunk)

  return client
}
