const THREE = require('three')

function loadTexture (texture, cb) {
  const url = require.resolve('prismarine-viewer/public/' + texture)
  cb(new THREE.TextureLoader().load(url))
}

function loadJSON (json, cb) {
  cb(require('prismarine-viewer/public/' + json))
}

module.exports = { loadTexture, loadJSON }
