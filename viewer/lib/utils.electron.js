const THREE = require('three')
const path = require('path')

const textureCache = {}
function loadTexture (texture, cb) {
  if (textureCache[texture]) return cb(textureCache[texture])
  const url = /^https?:\/\//.test(texture) ? texture : path.resolve(__dirname, '../../public/' + texture)
  new THREE.TextureLoader().load(url, loaded => {
    textureCache[texture] = loaded
    cb(loaded)
  }, undefined, () => {})
}

function loadJSON (json, cb) {
  cb(require(path.resolve(__dirname, '../../public/' + json)))
}

module.exports = { loadTexture, loadJSON }
