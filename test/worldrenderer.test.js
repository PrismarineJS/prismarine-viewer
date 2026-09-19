/* eslint-env jest */
const THREE = require('three')
const Chunks = require('prismarine-chunk')

jest.mock('../viewer/lib/utils', () => ({
  loadTexture: () => {},
  loadJSON: () => {}
}))

// Records messages instead of meshing, so tests read the sections the
// renderer asked for.
class FakeWorker {
  constructor () {
    this.messages = []
  }

  postMessage (data) {
    this.messages.push(data)
  }
}
global.Worker = FakeWorker

const { WorldRenderer } = require('../viewer/lib/worldrenderer')

describe('WorldRenderer section range', () => {
  let renderer
  let worker

  beforeEach(() => {
    renderer = new WorldRenderer(new THREE.Scene(), 1)
    worker = renderer.workers[0]
  })

  function dirtyYs (value) {
    return worker.messages
      .filter(m => m.type === 'dirty' && m.x === 0 && m.z === 0 && m.value === value)
      .map(m => m.y)
  }

  test.each([
    ['a 1.16.5 column', '1.16.5', undefined, 0, 240],
    ['a 1.18.2 overworld column', '1.18.2', undefined, -64, 304],
    ['a 1.18.2 column with a custom minY', '1.18.2', { minY: -128, worldHeight: 384 }, -128, 240]
  ])('%s passed as addColumn(x, z, chunk) is meshed over its own range', (_, version, options, bottom, top) => {
    const Chunk = Chunks(version)
    renderer.addColumn(0, 0, new Chunk(options).toJson())

    const ys = dirtyYs(true)
    expect(Math.min(...ys)).toBe(bottom)
    expect(Math.max(...ys)).toBe(top)
    expect(new Set(ys).size).toBe((top - bottom) / 16 + 1)
  })

  test('removeColumn clears the range the column was added with', () => {
    const Chunk = Chunks('1.18.2')
    renderer.addColumn(0, 0, new Chunk({ minY: -128, worldHeight: 384 }).toJson())
    renderer.removeColumn(0, 0)

    const ys = dirtyYs(false)
    expect(Math.min(...ys)).toBe(-128)
    expect(Math.max(...ys)).toBe(240)
  })
})
