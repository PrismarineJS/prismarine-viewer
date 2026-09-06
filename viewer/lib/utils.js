const { PNG } = require('pngjs')
const THREE = require('three')
const path = require('path')
const fs = require('fs')

const textureCache = {}

// bundled textures are files under public/; player skins are http(s) URLs
async function readPng (texture) {
  if (/^https?:\/\//.test(texture)) {
    const res = await fetch(texture)
    if (!res.ok) throw new Error(`${texture}: ${res.status}`)
    return PNG.sync.read(Buffer.from(await res.arrayBuffer()))
  }
  return PNG.sync.read(await fs.promises.readFile(path.resolve(__dirname, '../../public/' + texture)))
}

// todo not ideal, export different functions for browser and node
function loadTexture (texture, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadTexture(texture, cb)
  }

  if (!textureCache[texture]) {
    textureCache[texture] = readPng(texture).then(png => {
      const tex = new THREE.DataTexture(new Uint8Array(png.data), png.width, png.height, THREE.RGBAFormat)
      tex.needsUpdate = true
      return tex
    })
  }
  textureCache[texture].then(cb).catch(() => {})
}

function loadJSON (json, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadJSON(json, cb)
  }
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

module.exports = { loadTexture, loadJSON }
