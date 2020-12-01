
const { spawn } = require('child_process')
const THREE = require('three')
const { createCanvas } = require('node-canvas-webgl/lib')

const { Vec3 } = require('vec3')
const { getSectionGeometry } = require('../src/models')
const { makeTextureAtlas } = require('../lib/atlas')
const { prepareBlocksStates } = require('../lib/models')

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

function posInChunk (pos) {
  pos = pos.floored()
  pos.x &= 15
  pos.z &= 15
  return pos
}

function isCube (shapes) {
  if (!shapes || shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

function spiral (X, Y, fun) { // TODO: move that to spiralloop package
  let x = 0
  let y = 0
  let dx = 0
  let dy = -1
  const N = Math.max(X, Y) * Math.max(X, Y)
  const hX = X / 2
  const hY = Y / 2
  for (let i = 0; i < N; i++) {
    if (-hX < x && x <= hX && -hY < y && y <= hY) {
      fun(x, y)
    }
    if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
      const tmp = dx
      dx = -dy
      dy = tmp
    }
    x += dx
    y += dy
  }
}

function chunkPos (pos) {
  const x = Math.floor(pos.x / 16)
  const z = Math.floor(pos.z / 16)
  return [x, z]
}

class WorldRenderer {
  constructor (scene, atlas, blocksStates, world) {
    this.sectionMeshs = {}
    this.scene = scene
    this.world = world
    this.blocksStates = blocksStates
    this.blockCache = {}

    const texture = new THREE.CanvasTexture(atlas.canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.flipY = false
    this.material = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true, transparent: true, alphaTest: 0.1 })
  }

  getBlock (pos) {
    const column = this.world.getColumn(Math.floor(pos.x / 16), Math.floor(pos.z / 16))
    // null column means chunk not loaded
    if (!column) return null

    const loc = pos.floored()
    const locInChunk = posInChunk(loc)
    const stateId = column.getBlockStateId(locInChunk)

    if (!this.blockCache[stateId]) {
      const b = column.getBlock(locInChunk)
      b.isCube = isCube(b.shapes)
      this.blockCache[stateId] = b
    }

    const block = this.blockCache[stateId]
    block.position = loc
    return block
  }

  removeColumn (x, z) {
    for (let y = 0; y < 256; y += 16) {
      const key = sectionKey(x, y, z)
      const mesh = this.sectionMeshs[key]
      if (mesh) {
        this.scene.remove(mesh)
        delete this.sectionMeshs[key]
      }
    }
  }

  addColumn (x, z, chunk) {
    if (!chunk) return
    for (let y = 0; y < 256; y += 16) {
      const section = chunk.sections[Math.floor(y / 16)]
      if (!section) continue

      const key = sectionKey(x, y, z)
      let mesh = this.sectionMeshs[key]
      if (mesh) this.scene.remove(mesh)

      const geo = getSectionGeometry(x, y, z, this, this.blocksStates)

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(geo.positions, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(geo.normals, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(geo.colors, 3))
      geometry.setAttribute('uv', new THREE.BufferAttribute(geo.uvs, 2))
      geometry.setIndex(geo.indices)

      mesh = new THREE.Mesh(geometry, this.material)
      mesh.position.set(geo.sx, geo.sy, geo.sz)
      this.sectionMeshs[key] = mesh
      this.scene.add(mesh)
    }
  }
}

module.exports = (bot, { viewDistance = 6, port = 3000, outfile = 'output.mp4', frames = 200, width = 512, height = 512 }) => {
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

  const world = new WorldRenderer(scene, atlas, blocksStates, bot.world)

  // Load world
  const [botX, botZ] = chunkPos(bot.entity.position)
  spiral(viewDistance * 2, viewDistance * 2, (x, z) => {
    loadChunk(new Vec3((botX + x) * 16, 0, (botZ + z) * 16))
  })

  function loadChunk (pos) {
    // console.log(pos)
    world.addColumn(pos.x, pos.z, bot.world.getColumn(Math.floor(pos.x / 16), Math.floor(pos.z / 16)))
  }

  // Render loop streaming
  const ffmpeg = spawn('ffmpeg', ['-y', '-i', 'pipe:0', outfile])

  let idx = 0
  function update () {
    renderer.render(scene, camera)

    // console.log(`add frame ${idx}`)
    const imageStream = canvas.createJPEGStream({
      bufsize: 4096,
      quality: 100,
      progressive: false
    })

    imageStream.on('data', (chunk) => {
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(chunk)
      } else {
        console.log('Error: ffmpeg stdin closed!')
      }
    })
    imageStream.on('end', () => {
      idx++
      if (idx < frames) {
        setTimeout(update, 16)
      } else {
        console.log('done streaming')
        ffmpeg.stdin.end()
      }
    })
    imageStream.on('error', (err) => {
      console.log('ErrorOn_endAnimation', err.toString())
    })
  }

  update()

  function setCameraPos () {
    const pos = bot.entity.position
    camera.position.set(pos.x, pos.y + 1.6, pos.z)
    camera.rotation.x = bot.entity.pitch
    camera.rotation.y = bot.entity.yaw
  }

  // Register events
  bot.on('move', setCameraPos)

  bot.on('chunkColumnLoad', loadChunk)
}
