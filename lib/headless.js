/* global THREE */

const { spawn } = require('child_process')
const net = require('net')
global.THREE = require('three')
global.Worker = require('worker_threads').Worker
const { createCanvas } = require('node-canvas-webgl/lib')

const { Vec3 } = require('vec3')
const { WorldRenderer } = require('../src/worldrenderer')
const { Entities } = require('../src/entities')
const { getBufferFromStream, spiral, ViewRect, chunkPos } = require('./utils')

module.exports = (bot, { viewDistance = 6, output = 'output.mp4', frames = 200, width = 512, height = 512 }) => {
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

  const world = new WorldRenderer(scene)
  world.setVersion(bot.version)
  const entities = new Entities(scene)

  // Load world
  const loadedChunks = {}

  const [botX, botZ] = chunkPos(bot.entity.position)
  spiral(viewDistance * 2, viewDistance * 2, (x, z) => {
    loadChunk(new Vec3((botX + x) * 16, 0, (botZ + z) * 16))
  })

  for (const e in bot.entities) {
    createEntity(bot.entities[e])
  }

  function loadChunk (pos) {
    const [botX, botZ] = chunkPos(bot.entity.position)
    const dx = Math.abs(botX - Math.floor(pos.x / 16))
    const dz = Math.abs(botZ - Math.floor(pos.z / 16))
    if (dx < viewDistance && dz < viewDistance) {
      const column = bot.world.getColumnAt(pos)
      if (column) {
        const chunk = column.toJson()
        world.addColumn(pos.x, pos.z, chunk)
        const coords = pos.x + ',' + pos.z
        loadedChunks[coords] = true
      }
    }
  }

  function unloadChunk (pos) {
    world.removeColumn(pos.x, pos.z)
    delete loadedChunks[`${pos.x},${pos.z}`]
  }

  const lastPos = new Vec3(0, 0, 0).update(bot.entity.position)
  function botPosition () {
    setCameraPos()
    const [lastX, lastZ] = chunkPos(lastPos)
    const [botX, botZ] = chunkPos(bot.entity.position)
    if (lastX !== botX || lastZ !== botZ) {
      const newView = new ViewRect(botX, botZ, viewDistance)
      for (const coords of Object.keys(loadedChunks)) {
        const x = parseInt(coords.split(',')[0])
        const z = parseInt(coords.split(',')[1])
        const p = new Vec3(x, 0, z)
        if (!newView.contains(Math.floor(x / 16), Math.floor(z / 16))) {
          unloadChunk(p)
        }
      }
      spiral(viewDistance * 2, viewDistance * 2, (x, z) => {
        const p = new Vec3((botX + x) * 16, 0, (botZ + z) * 16)
        if (!loadedChunks[`${p.x},${p.z}`]) {
          loadChunk(p)
        }
      })
    }
    lastPos.update(bot.entity.position)
  }

  function setCameraPos () {
    const pos = bot.entity.position
    camera.position.set(pos.x, pos.y + 1.6, pos.z)
    camera.rotation.set(bot.entity.pitch, bot.entity.yaw, 0, 'ZYX')
  }

  function createEntity (e) {
    if (e !== bot.entity) {
      entities.update({ id: e.id, type: e.type, pos: e.position })
    }
  }

  function updateEntity (e) {
    if (e !== bot.entity) {
      entities.update({ id: e.id, pos: e.position })
    }
  }

  function removeEntity (e) {
    if (e !== bot.entity) {
      entities.update({ id: e.id, delete: true })
    }
  }

  function blockUpdate (oldBlock, newBlock) {
    const stateId = newBlock.stateId ? newBlock.stateId : ((newBlock.type << 4) | newBlock.metadata)
    world.setBlockStateId(oldBlock.position, stateId)
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

  // Register events
  bot.on('move', botPosition)
  bot.on('entitySpawn', createEntity)
  bot.on('entityMoved', updateEntity)
  bot.on('entityGone', removeEntity)
  bot.on('chunkColumnLoad', loadChunk)
  bot.on('blockUpdate', blockUpdate)

  return client
}
