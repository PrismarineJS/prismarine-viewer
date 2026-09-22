/* eslint-env jest */
const { Vec3 } = require('vec3')
const { getSectionGeometry } = require('../viewer/lib/models')

// A minimal resolved cube model (textures already atlas-resolved to {u,v,su,sv}), no cullface so it needs no neighbours.
function cubeModel () {
  const texture = { u: 0, v: 0, su: 1, sv: 1 }
  const faces = {}
  for (const face of ['down', 'up', 'north', 'south', 'west', 'east']) faces[face] = { texture }
  return { ao: false, textures: { particle: texture }, elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces }] }
}

function fakeBlock (name, pos) {
  return {
    name,
    position: pos,
    biome: { name: 'plains' },
    isCube: true,
    transparent: false,
    type: 1,
    getProperties: () => ({})
  }
}

// A world with a single block of `name` at the section origin, air everywhere else.
function worldWith (name) {
  return {
    getBlock (pos) {
      const isOrigin = pos.x === 0 && pos.y === 0 && pos.z === 0
      return fakeBlock(isOrigin ? name : 'air', new Vec3(pos.x, pos.y, pos.z))
    }
  }
}

const blocksStates = {
  oak_stairs: { variants: { normal: { model: cubeModel() } } },
  air: { variants: { normal: { model: cubeModel() } } },
  cave_air: { variants: { normal: { model: cubeModel() } } },
  void_air: { variants: { normal: { model: cubeModel() } } }
}

describe('getModelVariants air-name matching', () => {
  // Regression: `block.name.includes('air')` also matched "stairs" (st-air-s), hiding every *_stairs block.
  test('a *_stairs block is rendered (not skipped as air)', () => {
    const geo = getSectionGeometry(0, 0, 0, worldWith('oak_stairs'), blocksStates)
    expect(geo.positions.length).toBeGreaterThan(0)
  })

  test('the air blocks are still skipped', () => {
    for (const name of ['air', 'cave_air', 'void_air']) {
      expect(getSectionGeometry(0, 0, 0, worldWith(name), blocksStates).positions.length).toBe(0)
    }
  })
})
