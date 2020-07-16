const path = require('path')
const express = require('express')
const expressBrowserify = require('express-browserify')
const { makeTextureAtlas } = require('./atlas')
const { prepareBlocksStates } = require('./models')

function setupRoutes (app, version) {
  app.use('/', express.static(path.join(__dirname, '../public')))
  app.get('/index.js', expressBrowserify(path.join(__dirname, '../src/index.js')))
  app.get('/worker.js', expressBrowserify(path.join(__dirname, '../src/worker.js')))

  const mcAssets = require('minecraft-assets')(version)
  const atlas = makeTextureAtlas(mcAssets)
  const blocksStates = prepareBlocksStates(mcAssets, atlas)

  app.get('/texture.png', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': atlas.image.length
    })
    res.end(atlas.image)
  })

  app.get('/blocksStates.json', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(blocksStates))
  })
}

module.exports = {
  makeTextureAtlas,
  setupRoutes
}
