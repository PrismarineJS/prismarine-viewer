function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
const { loadImage } = safeRequire('node-canvas-webgl/lib')
const { createCanvas } = safeRequire('canvas')
const THREE = require('three')
const path = require('path')

const textureCache = {}
// todo not ideal, export different functions for browser and node
function loadTexture (texture, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadTexture(texture, cb)
  }

  if (textureCache[texture]) {
    cb(textureCache[texture])
  } else {
    loadImage(path.resolve(__dirname, '../../public/' + texture)).then(image => {
      textureCache[texture] = new THREE.CanvasTexture(image)
      cb(textureCache[texture])
    })
  }
}

const pixelCache = {}
// RGBA of a texture, for code that needs the picture itself and not just a map
function loadPixels (texture, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadPixels(texture, cb)
  }

  if (pixelCache[texture]) {
    cb(pixelCache[texture])
  } else {
    loadImage(path.resolve(__dirname, '../../public/' + texture)).then(image => {
      const canvas = createCanvas(image.width, image.height)
      canvas.getContext('2d').drawImage(image, 0, 0)
      pixelCache[texture] = canvas.getContext('2d').getImageData(0, 0, image.width, image.height)
      cb(pixelCache[texture])
    })
  }
}

function loadJSON (json, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadJSON(json, cb)
  }
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

module.exports = { loadTexture, loadPixels, loadJSON }
