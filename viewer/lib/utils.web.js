/* global XMLHttpRequest */
const THREE = require('three')

const textureCache = {}
function loadTexture (texture, cb) {
  if (!textureCache[texture]) {
    textureCache[texture] = new Promise(resolve => new THREE.TextureLoader().load(texture, resolve, undefined, () => {}))
  }
  textureCache[texture].then(cb)
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

module.exports = { loadTexture, loadJSON }
