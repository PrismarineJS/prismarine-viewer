const fs = require('fs')
const { Canvas, Image } = require('canvas')
const path = require('path')
const express = require('express')
const expressBrowserify = require('express-browserify')

function makeTextureAtlas (version) {
  const mcData = require('minecraft-data')(version)
  const mcAssets = require('minecraft-assets')(mcData.version.majorVersion)
  const blockList = Object.values(mcData.blocks)
  const texSize = Math.ceil(Math.sqrt(blockList.length))
  const tileSize = 16

  const canvas = new Canvas(texSize * tileSize, texSize * tileSize, 'png')
  const g = canvas.getContext('2d')
  for (const i in blockList) {
    const x = (i % texSize) * 16
    const y = Math.floor(i / texSize) * 16

    const b = blockList[i].name
    const asset = mcAssets.textureContent[b]

    if (asset && asset.texture) {
      const img = new Image()
      img.src = asset.texture
      g.drawImage(img, 0, 0, 16, 16, x, y, 16, 16)
    } else {
      g.fillStyle = '#ff00ff'
      g.fillRect(x, y, 16, 16)
    }
  }

  fs.writeFileSync('texture.png', canvas.toBuffer())

  return canvas.toBuffer()
}

function setupRoutes (app, version) {
  app.use('/', express.static(path.join(__dirname, '../public')))
  app.get('/index.js', expressBrowserify('src/index.js'))
  app.get('/texture.png', (req, res) => {
    const img = makeTextureAtlas(version)
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    })
    res.end(img)
  })
}

module.exports = {
  makeTextureAtlas,
  setupRoutes
}
