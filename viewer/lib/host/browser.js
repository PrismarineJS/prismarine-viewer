/* global Worker Image document fetch performance */

function isUrl (name) {
  return /^https?:\/\//.test(name)
}

// Host for browsers: assets are fetched relative to the page (the express
// server mounts public/ there), meshing runs on a Web Worker built from
// viewer/lib/worker.js, and text is drawn on a 2D canvas.
//
// textures.minecraft.net sends no CORS headers, so player skins are fetched
// through the server's proxy route (lib/mineflayer.js) instead; textureProxy
// is that route's prefix, or null to fetch skins directly.
function createBrowserHost ({ assetsUrl = '', workerUrl = 'worker.js', textureProxy = 'texture/' } = {}) {
  function resolve (name) {
    if (!isUrl(name)) return assetsUrl + name
    if (textureProxy !== null) return name.replace(/^https?:\/\/textures\.minecraft\.net\/texture\//, textureProxy)
    return name
  }

  return {
    loadImage (name) {
      const url = resolve(name)
      return new Promise((resolve, reject) => {
        const img = new Image()
        if (isUrl(url)) img.crossOrigin = 'anonymous'
        img.onload = () => resolve(imagePixels(img))
        img.onerror = () => reject(new Error(`${url} failed to load`))
        img.src = url
      })
    },

    async loadJSON (name) {
      const url = resolve(name)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${url}: ${res.status}`)
      return res.json()
    },

    createWorker () {
      const worker = new Worker(workerUrl)
      return {
        postMessage: (msg, transfer) => worker.postMessage(msg, transfer),
        onMessage: (cb) => { worker.onmessage = ({ data }) => cb(data) },
        terminate: () => worker.terminate()
      }
    },

    now: () => performance.now(),

    renderText (text) {
      const canvas = document.createElement('canvas')
      canvas.width = 500
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      ctx.font = '50pt Arial'
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(text, 100, 0)
      return imagePixels(canvas)
    }
  }
}

// RGBA rows of an image or canvas, top row first
function imagePixels (source) {
  const width = source.naturalWidth || source.width
  const height = source.naturalHeight || source.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0)
  const image = ctx.getImageData(0, 0, width, height)
  return { width, height, data: new Uint8Array(image.data.buffer) }
}

module.exports = { createBrowserHost }
