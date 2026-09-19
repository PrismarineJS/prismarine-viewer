/**
 * @jest-environment node
 */
/* eslint-env jest */
const THREE = require('three')

// Texture loads are held until a test releases them; the index and pixels answer at once.
const mockTextureLoads = []
jest.mock('../viewer/lib/utils', () => ({
  loadJSON: (url, onLoad) => onLoad([
    { name: 'diamond', texture: 'minecraft:items/diamond' },
    { name: 'decorated_pot', texture: 'minecraft:entity/decorated_pot/decorated_pot_side' }
  ]),
  loadPixels: (path, onLoad) => onLoad({ width: 1, height: 1, data: [255, 255, 255, 255] }),
  loadTexture: (path, onLoad) => mockTextureLoads.push(onLoad)
}))
jest.mock('canvas', () => ({ createCanvas: () => ({}) }))
jest.mock('../viewer/lib/entity/Entity', () => function () { throw new Error('no entity models here') })

const { Entities } = require('../viewer/lib/entities')

const flush = () => new Promise(resolve => setImmediate(resolve))
const pos = { x: 0, y: 64, z: 0 }
const spawn = extra => ({ id: 1, name: 'item', pos, width: 0.25, height: 0.25, ...extra })

function setup () {
  mockTextureLoads.length = 0
  const scene = new THREE.Scene()
  const entities = new Entities(scene)
  entities.setVersion('1.21.4')
  return { scene, entities }
}

const isMissingModel = o => o.isMesh && o.material.color?.getHex() === 0xff00ff

describe('dropped items', () => {
  it('has no mesh until the stack is known, even after moving', async () => {
    const { scene, entities } = setup()
    entities.update(spawn())
    entities.update({ id: 1, pos, pitch: 0, yaw: 1 })
    expect(entities.entities[1]).toBeUndefined()
    expect(scene.children).toHaveLength(0)

    entities.update({ id: 1, pos, itemName: 'diamond' })
    const mesh = entities.entities[1]
    expect(mesh.item).toBeDefined()
    await flush()
    mockTextureLoads.shift()(new THREE.Texture())
    expect(mesh.item.pivot.children).toHaveLength(1)
    let missing = 0
    scene.traverse(o => { if (isMissingModel(o)) missing++ })
    expect(missing).toBe(0)
  })

  it.each(['pale_oak_planks', 'decorated_pot'])('falls back to the missing model for %s', async itemName => {
    const { entities } = setup()
    entities.update(spawn())
    entities.update({ id: 1, pos, itemName })
    await flush()
    const group = entities.entities[1]
    expect(group.children.filter(isMissingModel)).toHaveLength(1)
    expect(group.children.find(isMissingModel).geometry.parameters.width).toBe(0.25)
    expect(mockTextureLoads).toHaveLength(0)
  })

  it('frees its geometry and material but not the shared map', async () => {
    const { entities } = setup()
    entities.update(spawn({ itemName: 'diamond' }))
    await flush()
    const map = new THREE.Texture()
    mockTextureLoads.shift()(map)
    const [mesh] = entities.entities[1].item.pivot.children
    const geometry = jest.spyOn(mesh.geometry, 'dispose')
    const material = jest.spyOn(mesh.material, 'dispose')
    const mapDispose = jest.spyOn(map, 'dispose')

    entities.update({ id: 1, delete: true })
    expect(geometry).toHaveBeenCalled()
    expect(material).toHaveBeenCalled()
    expect(mapDispose).not.toHaveBeenCalled()
  })

  it('builds nothing when a texture arrives after removal', async () => {
    const { entities } = setup()
    entities.update(spawn({ itemName: 'diamond' }))
    await flush()
    const group = entities.entities[1]
    entities.update({ id: 1, delete: true })
    mockTextureLoads.shift()(new THREE.Texture())
    expect(group.item.pivot.children).toHaveLength(0)
  })

  it('forgets a pending item once it is deleted', () => {
    const { entities } = setup()
    entities.update(spawn())
    entities.update({ id: 1, delete: true })
    expect(entities.items[1]).toBeUndefined()
  })
})
