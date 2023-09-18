function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
const { loadImage } = safeRequire('node-canvas-webgl/lib')
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

function loadJSON (json, cb) {
  if (process.platform === 'browser') {
    return require('./utils.web').loadJSON(json, cb)
  }
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

module.exports = { loadTexture, loadJSON }
