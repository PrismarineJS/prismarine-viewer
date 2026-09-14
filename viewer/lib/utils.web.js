/* global XMLHttpRequest */
const THREE = require('three')

const textureCache = {}
function loadTexture (texture, cb) {
  if (!textureCache[texture]) {
    // textures.minecraft.net sends no CORS headers: player skins go through the
    // server's proxy route (lib/mineflayer.js)
    const url = texture.replace(/^https?:\/\/textures\.minecraft\.net\/texture\//, 'texture/')
    textureCache[texture] = new Promise(resolve => new THREE.TextureLoader().load(url, resolve, undefined, () => {}))
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
