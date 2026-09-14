/* global XMLHttpRequest, document */
const THREE = require('three')

const textureCache = {}
function loadTexture (texture, cb) {
  if (!textureCache[texture]) {
    textureCache[texture] = new Promise(resolve => new THREE.TextureLoader().load(texture, resolve))
  }
  textureCache[texture].then(cb)
}

const pixelCache = {}
function loadPixels (texture, cb) {
  if (!pixelCache[texture]) {
    pixelCache[texture] = new Promise(resolve => new THREE.TextureLoader().load(texture, ({ image }) => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d').drawImage(image, 0, 0)
      resolve(canvas.getContext('2d').getImageData(0, 0, image.width, image.height))
    }))
  }
  pixelCache[texture].then(cb)
}

function loadJSON (url, callback) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'json'
  xhr.onload = function () {
    const status = xhr.status
    if (status === 200) {
      callback(xhr.response)
    } else {
      throw new Error(url + ' not found')
    }
  }
  xhr.send()
}

module.exports = { loadTexture, loadPixels, loadJSON }
