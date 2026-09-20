// Run after prerender; verifies the data actually shipped to browser workers.
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { World } = require('../viewer/lib/world')
const { getSectionGeometry } = require('../viewer/lib/models')
const { getVersion } = require('../viewer/lib/version')

const version = '1.21.8'
assert.strictEqual(getVersion(version), version)
assert.strictEqual(require('minecraft-assets')(version).version, version)
const data = require('minecraft-data')(version)
const states = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/blocksStates', version + '.json')))
let faces = 0
for (const block of data.blocksArray) {
  const state = states[block.name]
  assert(state, `Missing blockstate: ${block.name}`)
  const variants = state.variants ? Object.values(state.variants).flat() : state.multipart.flatMap(part => part.apply)
  for (const variant of variants) {
    assert(variant.model, `Missing model: ${block.name}`)
    for (const element of variant.model.elements) {
      for (const face of Object.values(element.faces)) {
        for (const key of ['u', 'v', 'su', 'sv']) {
          assert(Number.isFinite(face.texture?.[key]), `Invalid texture ${key}: ${block.name}`)
        }
        faces++
      }
    }
  }
}

const previous = require('minecraft-data')('1.21.4')
const added = data.blocksArray.filter(block => !previous.blocksByName[block.name])
const Chunk = require('prismarine-chunk')(version)
const pos = new Vec3(8, 72, 8)
for (const block of [...added, data.blocksByName.oak_stairs, data.blocksByName.pale_oak_stairs, data.blocksByName.resin_brick_stairs]) {
  for (let id = block.minStateId; id <= block.maxStateId; id++) {
    const column = new Chunk()
    column.setBlockStateId(pos, id)
    const world = new World(version)
    world.addColumn(0, 0, column.toJson())
    const geometry = getSectionGeometry(0, 64, 0, world, states)
    assert(geometry.positions.length > 0, `Empty geometry: ${block.name} state ${id}`)
    assert([...geometry.positions, ...geometry.uvs].every(Number.isFinite), `Invalid geometry: ${block.name} state ${id}`)
  }
}
console.log(`Validated ${data.blocksArray.length} blockstates, ${faces} textured faces, and every state of ${added.length} new blocks`)
