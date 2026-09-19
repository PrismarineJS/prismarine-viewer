/* eslint-env jest */
const Vec3 = require('vec3').Vec3
const Chunks = require('prismarine-chunk')
const { World } = require('../viewer/lib/world')
const { getSectionGeometry } = require('../viewer/lib/models')

// A stone cube with every face culled against its neighbor, as in vanilla.
const texture = { u: 0, v: 0, su: 1, sv: 1 }
const faces = Object.fromEntries(['down', 'up', 'north', 'south', 'west', 'east'].map(face => [face, { texture, cullface: face }]))
const blocksStates = {
  stone: { variants: { '': { model: { ao: false, textures: {}, elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces }] } } } }
}

function downFaces (world, y) {
  const { normals } = getSectionGeometry(0, Math.floor(y / 16) * 16, 0, world, blocksStates)
  let count = 0
  for (let i = 0; i < normals.length; i += 3) {
    if (normals[i + 1] === -1) count++
  }
  return count / 4
}

describe('models.js culling at the bottom of the world', () => {
  test.each([
    ['1.18.2 overworld', undefined, -64],
    ['1.18.2 custom minY', { minY: -128, worldHeight: 384 }, -128]
  ])('%s: faces above the floor render, faces below it are culled', (_, options, minY) => {
    const Chunk = Chunks('1.18.2')
    const stone = require('minecraft-data')('1.18.2').blocksByName.stone.defaultState
    const chunk = new Chunk(options)
    chunk.setBlockStateId(new Vec3(0, minY, 0), stone)
    chunk.setBlockStateId(new Vec3(0, minY + 20, 0), stone)

    const world = new World('1.18.2')
    world.addColumn(0, 0, chunk.toJson())

    expect(downFaces(world, minY)).toBe(0)
    expect(downFaces(world, minY + 20)).toBe(1)
  })
})
