const THREE = require('three')

// Per-host caches: a host is created per platform or per viewer, so textures
// it loaded are shared by everything rendering through it
const pixelCaches = new WeakMap()
const textureCaches = new WeakMap()

function cache (caches, host) {
  let c = caches.get(host)
  if (!c) caches.set(host, c = new Map())
  return c
}

// Minecraft textures are pixel art sampled with the image's top row at v = 0
function textureFromPixels ({ width, height, data }) {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.flipY = false
  texture.needsUpdate = true
  return texture
}

// Resolve to null when the image can't be loaded (a skin URL that 404s, an
// offline-mode server), so callers keep whatever they were showing
function loadPixels (host, name) {
  const c = cache(pixelCaches, host)
  if (!c.has(name)) c.set(name, host.loadImage(name).catch(() => null))
  return c.get(name)
}

function loadTexture (host, name) {
  const c = cache(textureCaches, host)
  if (!c.has(name)) c.set(name, loadPixels(host, name).then(pixels => pixels && textureFromPixels(pixels)))
  return c.get(name)
}

module.exports = { textureFromPixels, loadPixels, loadTexture }
