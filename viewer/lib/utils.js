
const { loadImage } = require('node-canvas-webgl/lib')
const THREE = require('three')

function loadTexture (texture, cb) {
  loadImage(require.resolve('prismarine-viewer/public/' + texture)).then(image => {
    cb(new THREE.CanvasTexture(image))
  })
}

function loadJSON (json, cb) {
  cb(require('prismarine-viewer/public/' + json))
}

module.exports = { loadTexture, loadJSON }
