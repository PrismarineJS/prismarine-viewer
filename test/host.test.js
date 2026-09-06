/* eslint-env jest */
const path = require('path')
const { createNodeHost } = require('../viewer/lib/host/node')
const { loadTexture, loadPixels } = require('../viewer/lib/textures')

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

  it('reads json assets', async () => {
    const json = await host.loadJSON('entity/entities.json')
    expect(json.player.geometry).toBeDefined()
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
