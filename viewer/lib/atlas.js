const fs = require('fs')
const { Canvas, Image } = require('canvas')
const path = require('path')

function nextPowerOfTwo (n) {
  if (n === 0) return 1
  n--
  n |= n >> 1
  n |= n >> 2
  n |= n >> 4
  n |= n >> 8
  n |= n >> 16
  return n + 1
}

function readTexture (basePath, name) {
  if (name === 'missing_texture.png') {
    // grab ./missing_texture.png
    basePath = __dirname
  }
  return fs.readFileSync(path.join(basePath, name), 'base64')
}

function loadImage (basePath, name) {
  const img = new Image()
  img.src = 'data:image/png;base64,' + readTexture(basePath, name)
  return img
}

// An animated texture is a vertical strip of square frames described by a
// .mcmeta next to it. Frame order and per-frame durations are baked into the
// atlas as repeated tiles, so the shader only needs a frame count, one frame
// time (in ticks) and the UV step between frames. "interpolate" is ignored.
function readAnimation (basePath, name, img) {
  const mcmetaPath = path.join(basePath, name + '.mcmeta')
  if (img.height <= img.width || !fs.existsSync(mcmetaPath)) return null
  const { animation } = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'))
  if (!animation) return null
  const frametime = animation.frametime || 1
  const frameCount = Math.floor(img.height / img.width)
  const frames = animation.frames || [...Array(frameCount).keys()]
  return {
    frametime,
    frameHeight: img.width,
    frames: frames.flatMap(f => typeof f === 'number' ? [f] : Array(Math.max(1, Math.round(f.time / frametime))).fill(f.index))
  }
}

// Tiles keep their native resolution (some are 32x32 since 26.1), so nothing
// here assumes a single atlas-wide tile size. Each entry carries its own
// u/v/su/sv extents, and an animated entry additionally carries its frame
// count, frame time and per-frame UV step, since that step now varies per
// texture rather than being uniform across the atlas.
function makeTextureAtlas (mcAssets) {
  const blocksTexturePath = path.join(mcAssets.directory, '/blocks')
  const textureFiles = fs.readdirSync(blocksTexturePath).filter(file => file.endsWith('.png'))
  textureFiles.unshift('missing_texture.png')

  // An animated texture reserves a vertical run of frames; a plain one that is
  // taller than wide contributes only its first frame, as model UV space maps
  // to a single frame either way.
  const tiles = textureFiles.map(file => {
    const img = loadImage(blocksTexturePath, file)
    const animation = readAnimation(blocksTexturePath, file, img)
    const frames = animation ? animation.frames : [0]
    const frameHeight = animation ? animation.frameHeight : Math.min(img.width, img.height)
    return { name: file.split('.')[0], img, animation, frames, frameHeight, w: img.width, h: frameHeight * frames.length }
  })

  // shelf-pack: sort by height, lay out rows, then round the atlas up to a power of two
  const totalArea = tiles.reduce((a, t) => a + t.w * t.h, 0)
  const maxWidth = Math.max(...tiles.map(t => t.w))
  const width = nextPowerOfTwo(Math.max(maxWidth, Math.ceil(Math.sqrt(totalArea))))
  tiles.sort((a, b) => b.h - a.h)

  let shelfX = 0
  let shelfY = 0
  let shelfH = 0
  let packedHeight = 0
  for (const tile of tiles) {
    if (shelfX + tile.w > width) {
      shelfX = 0
      shelfY += shelfH
      shelfH = 0
    }
    tile.x = shelfX
    tile.y = shelfY
    shelfX += tile.w
    shelfH = Math.max(shelfH, tile.h)
    packedHeight = Math.max(packedHeight, shelfY + tile.h)
  }
  const height = nextPowerOfTwo(packedHeight)

  const canvas = new Canvas(width, height, 'png')
  const g = canvas.getContext('2d')

  const texturesIndex = {}

  for (const tile of tiles) {
    const framestep = tile.frameHeight / height
    texturesIndex[tile.name] = { u: tile.x / width, v: tile.y / height, su: tile.w / width, sv: framestep }
    if (tile.animation) {
      texturesIndex[tile.name].frames = tile.frames.length
      texturesIndex[tile.name].frametime = tile.animation.frametime
      texturesIndex[tile.name].framestep = framestep
    }
    tile.frames.forEach((frame, i) => {
      g.drawImage(tile.img, 0, frame * tile.frameHeight, tile.w, tile.frameHeight,
        tile.x, tile.y + i * tile.frameHeight, tile.w, tile.frameHeight)
    })
  }

  return { image: canvas.toBuffer(), canvas, json: { width, height, textures: texturesIndex } }
}

module.exports = {
  makeTextureAtlas
}
