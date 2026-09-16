/* eslint-env jest */
const THREE = require('three')

// worldBounds.json callbacks stay pending until a test invokes them.
const mockBounds = { pending: [] }
jest.mock('../viewer/lib/utils', () => ({
  loadTexture: () => {},
  loadJSON: (name, cb) => {
    if (name === 'worldBounds.json') mockBounds.pending.push(cb)
  }
}))

// Every dirty message must be answered with sectionFinished, as worker.js
// does for sections it holds no chunk for.
class FakeWorker {
  constructor () {
    this.messages = []
  }

  postMessage (data) {
    this.messages.push(data)
    if (data.type === 'dirty') {
      setImmediate(() => this.onmessage({ data: { type: 'sectionFinished', key: `${data.x},${data.y},${data.z}` } }))
    }
  }
}
global.Worker = FakeWorker

const { WorldRenderer } = require('../viewer/lib/worldrenderer')

const BOUNDS = { '1.18.2': { minY: -64, worldHeight: 384 } }
const flush = () => new Promise(resolve => setImmediate(resolve))

function sectionGeometry (sx, sy, sz) {
  return {
    positions: new Float32Array(3),
    normals: new Float32Array(3),
    colors: new Float32Array(3),
    uvs: new Float32Array(2),
    animations: new Float32Array(3),
    indices: [0, 0, 0],
    sx,
    sy,
    sz
  }
}

describe('WorldRenderer with a delayed world bounds load', () => {
  let renderer
  let worker

  beforeEach(() => {
    mockBounds.pending = []
    renderer = new WorldRenderer(new THREE.Scene(), 1)
    worker = renderer.workers[0]
  })

  test('a removal queued before the bounds land does not touch a replacement world', async () => {
    renderer.setVersion('1.18.2')
    renderer.addColumn(0, 0, {})
    renderer.removeColumn(0, 0)

    renderer.setVersion('1.18.2')
    renderer.addColumn(0, 0, {})
    mockBounds.pending[1](BOUNDS)
    await flush()
    worker.onmessage({ data: { type: 'geometry', key: '0,0,0', geometry: sectionGeometry(0, 0, 0) } })
    const mesh = renderer.sectionMeshs['0,0,0']
    expect(mesh).toBeDefined()

    mockBounds.pending[0](BOUNDS)
    await flush()
    expect(renderer.sectionMeshs['0,0,0']).toBe(mesh)
    expect(renderer.scene.children).toContain(mesh)
    expect(worker.messages.filter(m => m.type === 'dirty' && m.value === false)).toHaveLength(0)
  })
})
