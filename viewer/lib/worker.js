/* global postMessage self */

if (!global.self) {
  // If we are in a node environement, we need to fake some env variables
  /* eslint-disable no-eval */
  const r = eval('require') // yeah I know bad spooky eval, booouh
  const { parentPort } = r('worker_threads')
  global.self = parentPort
  global.postMessage = (value, transferList) => { parentPort.postMessage(value, transferList) }
  global.performance = r('perf_hooks').performance
}

const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry } = require('./models')

let blocksStates = null
let world = null

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

const dirtySections = {}

function setSectionDirty (pos, value = true) {
  const x = Math.floor(pos.x / 16) * 16
  const y = Math.floor(pos.y / 16) * 16
  const z = Math.floor(pos.z / 16) * 16
  const chunk = world.getColumn(x, z)
  const key = sectionKey(x, y, z)
  if (!value) {
    delete dirtySections[key]
    postMessage({ type: 'sectionFinished', key })
  } else if (chunk) {
    // FIX: Account for chunk.minY when calculating section index
    // For 1.18+: minY=-64, so Y=-64 -> index 0, Y=-48 -> index 1, etc.
    const sectionIndex = Math.floor((y - chunk.minY) / 16)
    if (chunk.sections[sectionIndex]) {
      dirtySections[key] = value
    } else {
      postMessage({ type: 'sectionFinished', key })
    }
  } else {
    postMessage({ type: 'sectionFinished', key })
  }
}

self.onmessage = ({ data }) => {
  if (data.type === 'version') {
    world = new World(data.version)
  } else if (data.type === 'blockStates') {
    blocksStates = data.json
  } else if (data.type === 'dirty') {
    const loc = new Vec3(data.x, data.y, data.z)
    setSectionDirty(loc, data.value)
  } else if (data.type === 'chunk') {
    console.log(`[WORKER] Received chunk at (${data.x}, ${data.z})`)
    const chunk = world.addColumn(data.x, data.z, data.chunk)

    // Log chunk structure
    console.log(`[WORKER] Chunk sections:`, chunk.sections ? chunk.sections.length : 'undefined')

    // Sample some blocks from the chunk to see if they're air
    // Convert chunk coordinates to world coordinates (multiply by 16)
    const sampleBlocks = []
    for (let y = -64; y < -60; y++) {
      const block = world.getBlock(new Vec3(data.x * 16, y, data.z * 16))
      if (block) {
        sampleBlocks.push({ y, name: block.name, type: block.type, stateId: block.stateId })
      }
    }
    console.log(`[WORKER] Sample blocks from chunk (${data.x}, ${data.z}):`, JSON.stringify(sampleBlocks))

    // FIX: Mark all sections in the newly loaded chunk as dirty so they get rendered
    // This triggers the geometry generation interval to process them
    // Minecraft 1.18+ world height: Y=-64 to Y=320 (24 sections * 16 blocks each)
    for (let y = -64; y < 320; y += 16) {
      const loc = new Vec3(data.x * 16, y, data.z * 16)
      setSectionDirty(loc, true)
    }
    console.log(`[WORKER] Marked ${(320 - (-64)) / 16} sections dirty for chunk (${data.x}, ${data.z})`)
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

setInterval(() => {
  if (world === null || blocksStates === null) return
  const sections = Object.keys(dirtySections)

  if (sections.length === 0) return
  // console.log(sections.length + ' dirty sections')

  // const start = performance.now()
  for (const key of sections) {
    let [x, y, z] = key.split(',')
    x = parseInt(x, 10)
    y = parseInt(y, 10)
    z = parseInt(z, 10)
    const chunk = world.getColumn(x, z)
    if (chunk) {
      // FIX: Account for chunk.minY when calculating section index
      const sectionIndex = Math.floor((y - chunk.minY) / 16)
      if (chunk.sections[sectionIndex]) {
        delete dirtySections[key]
        const geometry = getSectionGeometry(x, y, z, world, blocksStates)
        console.log(`[WORKER] Section (${x}, ${y}, ${z}) geometry: ${geometry.positions.length / 3} vertices, ${geometry.indices.length / 3} triangles`)
        const transferable = [geometry.positions.buffer, geometry.normals.buffer, geometry.colors.buffer, geometry.uvs.buffer]
        postMessage({ type: 'geometry', key, geometry }, transferable)
      }
    }
    postMessage({ type: 'sectionFinished', key })
  }
  // const time = performance.now() - start
  // console.log(`Processed ${sections.length} sections in ${time} ms (${time / sections.length} ms/section)`)
}, 50)
