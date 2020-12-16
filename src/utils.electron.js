/* global XMLHttpRequest */
const THREE = require('three')

function loadTexture(texture, cb) {
  cb(new THREE.TextureLoader().load(texture))
}

function loadJSON(json, cb) {
  cb(require('../public/' + json))
}

module.exports = { loadTexture, loadJSON }
