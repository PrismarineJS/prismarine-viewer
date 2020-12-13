const path = require('path')
const compression = require('compression')
const express = require('express')
const expressBrowserify = require('express-browserify')
const { makeTextureAtlas } = require('./atlas')
const { prepareBlocksStates } = require('./models')

function setupRoutes (app, version, prefix) {
  app.use(compression())

  app.use(prefix + '/', express.static(path.join(__dirname, '../public')))
  app.get(prefix + '/index.js', expressBrowserify(path.join(__dirname, '../src/index.js')))
  app.get(prefix + '/worker.js', expressBrowserify(path.join(__dirname, '../src/worker.js')))

  const mcAssets = require('minecraft-assets')(version)
  const atlas = makeTextureAtlas(mcAssets)
  const blocksStates = JSON.stringify(prepareBlocksStates(mcAssets, atlas))

  app.get(prefix + '/texture.png', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': atlas.image.length
    })
    res.end(atlas.image)
  })

  app.get(prefix + '/blocksStates.json', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(blocksStates)
  })
}

module.exports = {
  makeTextureAtlas,
  setupRoutes
}
