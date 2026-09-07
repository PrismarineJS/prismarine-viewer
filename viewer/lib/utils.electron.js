// Deprecated: the viewer loads through a host now (see ./host). Kept for code
// that imported these loaders directly.
const { createElectronHost } = require('./host/electron')
const { loadTexture: load } = require('./textures')

let host
function getHost () {
  if (!host) host = createElectronHost()
  return host
}

function loadTexture (texture, cb) {
  load(getHost(), texture).then(texture => { if (texture) cb(texture) })
}

function loadJSON (json, cb) {
  getHost().loadJSON(json).then(cb)
}

module.exports = { loadTexture, loadJSON }
