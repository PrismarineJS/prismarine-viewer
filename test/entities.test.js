/**
 * @jest-environment node
 */
/* eslint-env jest */

// canvas is native and only draws name tags; no entity here has a username
jest.mock('canvas', () => ({ createCanvas: () => { throw new Error('unused') } }))
// The model loader needs the viewer's global THREE; a bare group stands in for the model
jest.mock('../viewer/lib/entity/Entity', () => {
  const THREE = require('three')
  return class { constructor () { this.mesh = new THREE.Group() } }
})

const THREE = require('three')
const { Entities } = require('../viewer/lib/entities')

const pos = { x: 1, y: 64, z: 1 }
const spawn = { id: 1, name: 'armor_stand', pos, width: 0.5, height: 1.975 }

describe('invisible entities', () => {
  let scene, entities
  beforeEach(() => {
    scene = new THREE.Scene()
    entities = new Entities(scene)
  })

  it('stay hidden through updates that do not carry the flag', () => {
    entities.update({ ...spawn, invisible: true })
    entities.update({ id: 1, pos, pitch: 0, yaw: 1 })
    entities.update({ id: 1, riding: true })
    entities.update({ id: 1, hurt: true })
    expect(entities.entities[1]).toBeUndefined()
    expect(scene.children).toHaveLength(0)
  })

  it('lose their mesh when they turn invisible, and get it back when they turn visible', () => {
    entities.update({ ...spawn, invisible: false })
    expect(scene.children).toHaveLength(1)
    entities.update({ ...spawn, invisible: true })
    entities.update({ id: 1, pos, pitch: 0, yaw: 1 })
    expect(scene.children).toHaveLength(0)
    entities.update({ ...spawn, invisible: false })
    expect(entities.entities[1]).toBeDefined()
    expect(scene.children).toHaveLength(1)
  })

  it('do not leave their state behind for a reused id', () => {
    entities.update({ ...spawn, invisible: true })
    entities.update({ id: 1, delete: true })
    entities.update({ ...spawn })
    expect(scene.children).toHaveLength(1)

    entities.update({ id: 2, name: 'zombie', pos, width: 0.6, height: 1.95, invisible: true })
    entities.clear()
    entities.update({ id: 2, pos, pitch: 0, yaw: 1 })
    expect(scene.children).toHaveLength(1)
  })
})
