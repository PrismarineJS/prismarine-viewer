const fs = require('fs')
const path = require('path')
const { Worker } = require('worker_threads')
const { PNG } = require('pngjs')

let createCanvas
try { ({ createCanvas } = require('canvas')) } catch {}

function isUrl (name) {
  return /^https?:\/\//.test(name)
}

// Host for node: assets are read from the prerendered public/ directory (or
// any http(s) URL), meshing runs on worker_threads, and username sprites are
// drawn with node-canvas when it is installed. Nothing here needs a GL canvas,
// so it pairs with headless-gl, node-canvas-webgl or any other renderer.
function createNodeHost ({ assetsDir = path.resolve(__dirname, '../../../public'), fetch = globalThis.fetch, workerFile = path.join(__dirname, '../worker.js') } = {}) {
  async function readAsset (name) {
    if (!isUrl(name)) return fs.promises.readFile(path.resolve(assetsDir, name))
    const res = await fetch(name)
    if (!res.ok) throw new Error(`${name}: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }

  return {
    async loadImage (name) {
      const png = PNG.sync.read(await readAsset(name))
      return { width: png.width, height: png.height, data: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength) }
    },

    async loadJSON (name) {
      return JSON.parse((await readAsset(name)).toString('utf8'))
    },

    createWorker () {
      const worker = new Worker(workerFile)
      return {
        postMessage: (msg, transfer) => worker.postMessage(msg, transfer),
        onMessage: (cb) => worker.on('message', cb),
        terminate: () => worker.terminate()
      }
    },

    now: () => performance.now(),

    renderText: createCanvas ? (text) => renderText(createCanvas, text) : null
  }
}

function renderText (createCanvas, text) {
  const canvas = createCanvas(500, 100)
  const ctx = canvas.getContext('2d')
  ctx.font = '50pt Arial'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(text, 100, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { width: image.width, height: image.height, data: new Uint8Array(image.data.buffer) }
}

module.exports = { createNodeHost, renderText }
