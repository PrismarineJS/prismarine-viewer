/* global XMLHttpRequest */
const THREE = require('three')
const path = require('path')

function loadTexture(texture, cb) {
  const url = path.resolve(__dirname, '../public/' + texture)
  cb(new THREE.TextureLoader().load(url))
}

function loadJSON(json, cb) {
  cb(require('../public/' + json))
}

module.exports = { loadTexture, loadJSON }
