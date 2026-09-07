/* eslint-env jest */
const fs = require('fs')
const path = require('path')
const { createNodeHost } = require('../viewer/lib/host/node')
const { loadTexture, loadPixels } = require('../viewer/lib/textures')
const { createMesher, createInlineWorker } = require('../viewer/lib/mesher')
const { Vec3 } = require('vec3')

const version = '1.16.4'
const stoneColumn = () => {
  const Chunk = require('prismarine-chunk')(version)
  const stone = require('minecraft-data')(version).blocksByName.stone.defaultState
  const chunk = new Chunk()
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) chunk.setBlockStateId(new Vec3(x, 0, z), stone)
  return chunk.toJson()
}
const blockStates = () => require('../public/blocksStates/' + version + '.json')

describe('node host', () => {
  const host = createNodeHost({ assetsDir: path.join(__dirname, '../viewer/lib') })

  it('decodes a png into RGBA rows', async () => {
    const image = await host.loadImage('missing_texture.png')
    expect(image.width).toBe(16)
    expect(image.height).toBe(16)
    expect(image.data).toBeInstanceOf(Uint8Array)
    expect(image.data.length).toBe(16 * 16 * 4)
    expect(image.data[3]).toBe(255)
  })

  it('decodes without holding the event loop', async () => {
    const { PNG } = require('pngjs')
    const atlas = createNodeHost()
    const buffer = await fs.promises.readFile(path.join(__dirname, '../public/textures/1.16.4.png'))
    const settle = () => new Promise(resolve => setTimeout(resolve, 10))
    const longestBlock = async (work) => {
      let longest = 0
      let last = performance.now()
      const timer = setInterval(() => { const now = performance.now(); longest = Math.max(longest, now - last - 2); last = now }, 2)
      try {
        await settle() // let the timer fire once so a block before the first tick still shows up
        await work()
        await settle()
      } finally { clearInterval(timer) }
      return longest
    }
    const blocking = await longestBlock(async () => PNG.sync.read(buffer))
    const streamed = await longestBlock(async () => expect((await atlas.loadImage('textures/1.16.4.png')).width).toBe(1024))
    expect(streamed).toBeLessThan(blocking / 2)
  })

  it('reads json assets', async () => {
    const json = await host.loadJSON('entity/entities.json')
    expect(json.player.geometry).toBeDefined()
  })

  it('reads an asset as text without parsing it', async () => {
    const text = await host.loadText('entity/entities.json')
    expect(typeof text).toBe('string')
    expect(JSON.parse(text).player.geometry).toBeDefined()
  })

  it('rejects a missing asset', async () => {
    await expect(host.loadImage('nope.png')).rejects.toThrow()
  })

  it('meshes on a worker thread', async () => {
    const worker = host.createWorker()
    const first = new Promise(resolve => worker.onMessage(resolve))
    worker.postMessage({ type: 'version', version: '1.16.4' })
    worker.postMessage({ type: 'dirty', x: 0, y: 0, z: 0, value: false })
    expect(await first).toEqual({ type: 'sectionFinished', key: '0,0,0' })
    worker.terminate()
  })
})

describe('textures', () => {
  const host = createNodeHost({ assetsDir: path.join(__dirname, '../viewer/lib') })

  it('builds a nearest-filtered DataTexture that is not flipped', async () => {
    const THREE = require('three')
    const texture = await loadTexture(host, 'missing_texture.png')
    expect(texture).toBeInstanceOf(THREE.DataTexture)
    expect(texture.image.width).toBe(16)
    expect(texture.magFilter).toBe(THREE.NearestFilter)
    expect(texture.flipY).toBe(false)
  })

  it('caches per host and shares pixels with the texture', async () => {
    expect(await loadTexture(host, 'missing_texture.png')).toBe(await loadTexture(host, 'missing_texture.png'))
    expect((await loadTexture(host, 'missing_texture.png')).image.data).toBe((await loadPixels(host, 'missing_texture.png')).data)
    expect(await loadTexture(createNodeHost(), 'missing_texture.png')).toBe(null)
  })

  it('resolves null instead of failing when an image is unavailable', async () => {
    expect(await loadTexture(host, 'nope.png')).toBe(null)
    expect(await loadPixels(host, 'nope.png')).toBe(null)
  })
})

describe('mesher', () => {
  it('meshes a dirty section and reports the rest finished', () => {
    const posted = []
    const mesher = createMesher((msg, transfer) => posted.push({ msg, transfer }))
    mesher.handle({ type: 'version', version })
    mesher.handle({ type: 'blockStates', json: blockStates() })
    mesher.handle({ type: 'chunk', x: 0, z: 0, chunk: stoneColumn() })
    mesher.handle({ type: 'dirty', x: 0, y: 0, z: 0, value: true })
    mesher.handle({ type: 'dirty', x: 0, y: 64, z: 0, value: true })
    expect(posted.map(p => p.msg.type)).toEqual(['sectionFinished'])
    mesher.tick()
    const types = posted.map(p => p.msg.type)
    expect(types).toEqual(['sectionFinished', 'geometry', 'sectionFinished'])
    const { msg, transfer } = posted[1]
    expect(msg.key).toBe('0,0,0')
    expect(msg.geometry.positions.length).toBeGreaterThan(0)
    expect(transfer).toContain(msg.geometry.positions.buffer)
  })

  it('parses block states handed over as text', () => {
    const posted = []
    const mesher = createMesher((msg, transfer) => posted.push({ msg, transfer }))
    mesher.handle({ type: 'version', version })
    mesher.handle({ type: 'blockStates', text: JSON.stringify(blockStates()) })
    mesher.handle({ type: 'chunk', x: 0, z: 0, chunk: stoneColumn() })
    mesher.handle({ type: 'dirty', x: 0, y: 0, z: 0, value: true })
    mesher.tick()
    expect(posted.map(p => p.msg.type)).toContain('geometry')
  })

  it('runs inline behind the host worker interface', async () => {
    const worker = createInlineWorker()
    const geometry = new Promise(resolve => worker.onMessage(msg => { if (msg.type === 'geometry') resolve(msg) }))
    worker.postMessage({ type: 'version', version })
    worker.postMessage({ type: 'blockStates', json: blockStates() })
    worker.postMessage({ type: 'chunk', x: 0, z: 0, chunk: stoneColumn() })
    worker.postMessage({ type: 'dirty', x: 0, y: 0, z: 0, value: true })
    expect((await geometry).key).toBe('0,0,0')
    worker.terminate()
  })
})
