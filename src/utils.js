
const { loadImage } = require('node-canvas-webgl/lib')
const path = require('path')
const THREE = require('three')

function loadTexture (texture, cb) {
  loadImage(path.resolve(__dirname, '../public/' + texture)).then(image => {
    cb(new THREE.CanvasTexture(image))
  })
}

function loadJSON (json, cb) {
  cb(require('../public/' + json))
}

module.exports = { loadTexture, loadJSON }
