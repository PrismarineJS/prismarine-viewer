
const { loadImage } = require('node-canvas-webgl/lib')
const THREE = require('three')
const path = require('path')

function loadTexture (texture, cb) {
  loadImage(path.resolve(__dirname, '../../public/' + texture)).then(image => {
    cb(new THREE.CanvasTexture(image))
  })
}

function loadJSON (json, cb) {
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

module.exports = { loadTexture, loadJSON }
