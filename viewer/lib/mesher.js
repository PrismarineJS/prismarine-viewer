const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry } = require('./models')

// The meshing state machine: fed the main thread's messages through handle(),
// it keeps a copy of the loaded columns and the set of dirty sections, and
// each tick() meshes the dirty ones and hands the geometry to post(). Where
// it runs (a Web Worker, a worker_thread, inline) is the shell's business.
function createMesher (post) {
  let blocksStates = null
  let world = null
  const dirtySections = {}

  function sectionKey (x, y, z) {
    return `${x},${y},${z}`
  }

  function setSectionDirty (pos, value = true) {
    const x = Math.floor(pos.x / 16) * 16
    const y = Math.floor(pos.y / 16) * 16
    const z = Math.floor(pos.z / 16) * 16
    const chunk = world.getColumn(x, z)
    const key = sectionKey(x, y, z)
    if (!value) {
      delete dirtySections[key]
      post({ type: 'sectionFinished', key })
    } else if (chunk && chunk.sections[Math.floor(y / 16)]) {
      dirtySections[key] = value
    } else {
      post({ type: 'sectionFinished', key })
    }
  }

  function handle (data) {
    if (data.type === 'version') {
      world = new World(data.version)
    } else if (data.type === 'blockStates') {
      blocksStates = data.json ?? JSON.parse(data.text)
    } else if (data.type === 'dirty') {
      const loc = new Vec3(data.x, data.y, data.z)
      setSectionDirty(loc, data.value)
    } else if (data.type === 'chunk') {
      world.addColumn(data.x, data.z, data.chunk)
    } else if (data.type === 'unloadChunk') {
      world.removeColumn(data.x, data.z)
    } else if (data.type === 'blockUpdate') {
      const loc = new Vec3(data.pos.x, data.pos.y, data.pos.z).floored()
      world.setBlockStateId(loc, data.stateId)
    } else if (data.type === 'reset') {
      world = null
      blocksStates = null
    }
  }

  function tick () {
    if (world === null || blocksStates === null) return
    const sections = Object.keys(dirtySections)
    if (sections.length === 0) return

    for (const key of sections) {
      let [x, y, z] = key.split(',')
      x = parseInt(x, 10)
      y = parseInt(y, 10)
      z = parseInt(z, 10)
      const chunk = world.getColumn(x, z)
      if (chunk && chunk.sections[Math.floor(y / 16)]) {
        delete dirtySections[key]
        const geometry = getSectionGeometry(x, y, z, world, blocksStates)
        const transferable = [geometry.positions.buffer, geometry.normals.buffer, geometry.colors.buffer, geometry.uvs.buffer, geometry.animations.buffer]
        post({ type: 'geometry', key, geometry }, transferable)
      }
      post({ type: 'sectionFinished', key })
    }
  }

  return { handle, tick }
}

const TICK_MS = 50

// A host worker that meshes on the calling thread: no extra copy of the
// block data, at the cost of meshing on the render thread
function createInlineWorker () {
  let listener = () => {}
  const mesher = createMesher((msg) => listener(msg))
  const timer = setInterval(() => mesher.tick(), TICK_MS)
  return {
    postMessage: (msg) => mesher.handle(msg),
    onMessage: (cb) => { listener = cb },
    terminate: () => clearInterval(timer)
  }
}

module.exports = { createMesher, createInlineWorker, TICK_MS }
