/* global document */
const THREE = require('three')
const path = require('path')

const textureCache = {}
function loadTexture (texture, cb) {
  if (!textureCache[texture]) {
    const url = path.resolve(__dirname, '../../public/' + texture)
    textureCache[texture] = new THREE.TextureLoader().load(url)
  }
  cb(textureCache[texture])
}

const pixelCache = {}
function loadPixels (texture, cb) {
  if (!pixelCache[texture]) {
    const url = path.resolve(__dirname, '../../public/' + texture)
    pixelCache[texture] = new Promise(resolve => new THREE.TextureLoader().load(url, ({ image }) => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d').drawImage(image, 0, 0)
      resolve(canvas.getContext('2d').getImageData(0, 0, image.width, image.height))
    }))
  }
  pixelCache[texture].then(cb)
}

function loadJSON (json, cb) {
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

module.exports = { loadTexture, loadPixels, loadJSON }
