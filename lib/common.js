const path = require('path')
const express = require('express')
const expressBrowserify = require('express-browserify')
const { makeTextureAtlas } = require('./atlas')
const { resolveModel } = require('./models')

function setupRoutes (app, version) {
  app.use('/', express.static(path.join(__dirname, '../public')))
  app.get('/index.js', expressBrowserify(path.join(__dirname, '../src/index.js')))

  const mcAssets = require('minecraft-assets')(version)
  const atlas = makeTextureAtlas(mcAssets)

  app.get('/texture.png', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': atlas.image.length
    })
    res.end(atlas.image)
  })

  const blocksStates = mcAssets.blocksStates
  for (const block of Object.values(blocksStates)) {
    if (block.variants) {
      for (const variant of Object.values(block.variants)) {
        if (variant instanceof Array) {
          for (const v of variant) {
            v.model = resolveModel(v.model, mcAssets.blocksModels, atlas.json)
          }
        } else {
          variant.model = resolveModel(variant.model, mcAssets.blocksModels, atlas.json)
        }
      }
    }
    if (block.multipart) {
      for (const variant of block.multipart) {
        if (variant.apply instanceof Array) {
          for (const v of variant.apply) {
            v.model = resolveModel(v.model, mcAssets.blocksModels, atlas.json)
          }
        } else {
          variant.apply.model = resolveModel(variant.apply.model, mcAssets.blocksModels, atlas.json)
        }
      }
    }
  }

  app.get('/blocksStates.json', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(blocksStates))
  })
}

module.exports = {
  makeTextureAtlas,
  setupRoutes
}
