const path = require('path')
const compression = require('compression')
const express = require('express')
const expressBrowserify = require('express-browserify')
const { makeTextureAtlas } = require('./atlas')
const { prepareBlocksStates } = require('./models')

function loadData (versionType, majorVersion) {
  const dataSource = require('../node_modules/minecraft-data/minecraft-data/data/dataPaths')

  if (dataSource[versionType]) {
    if (dataSource[versionType][majorVersion]) {
      const data = []

      for (const dataFile in dataSource[versionType][majorVersion]) {
        data.push('./minecraft-data/data/' + dataSource[versionType][majorVersion][dataFile] + '/' + dataFile + '.json')
      }

      return data
    }
  }

  return null
}

function toMajor (mcVersion, preNetty, typeArg) {
  const parts = (mcVersion + '').split('_')
  const type = typeArg || (parts.length === 2 ? parts[0] : 'pc')
  const version = parts.length === 2 ? parts[1] : mcVersion
  let majorVersion

  if (loadData(type, version)) {
    majorVersion = version
  } else if (versionsByMinecraftVersion[type][version]) {
    majorVersion = versionsByMinecraftVersion[type][version].majorVersion
  } else if (preNetty && preNettyVersionsByProtocolVersion[type][version]) {
    return toMajor(preNettyVersionsByProtocolVersion[type][version][0].minecraftVersion, preNetty, type)
  } else if (!preNetty && postNettyVersionsByProtocolVersion[type][version]) {
    return toMajor(postNettyVersionsByProtocolVersion[type][version][0].minecraftVersion, preNetty, type)
  } else if (versionsByMajorVersion[type][version]) {
    majorVersion = versionsByMajorVersion[type][version].minecraftVersion
  }

  return {
    majorVersion: majorVersion,
    type: type
  }
}

function setupRoutes (app, version) {
  app.use(compression())

  const workerSrc = expressBrowserify(path.join(__dirname, '../src/worker.js'))

  const majorVersion = toMajor(version, false)
  const dataPaths = loadData(majorVersion.type, majorVersion.majorVersion)
  for (const path of dataPaths) {
    workerSrc.browserify.require(`./node_modules/minecraft-data/${path.substring(2)}`, { expose: path })
  }

  app.use('/', express.static(path.join(__dirname, '../public')))
  app.get('/index.js', expressBrowserify(path.join(__dirname, '../src/index.js')))
  app.get('/worker.js', workerSrc)

  const mcAssets = require('minecraft-assets')(version)
  const atlas = makeTextureAtlas(mcAssets)
  const blocksStates = JSON.stringify(prepareBlocksStates(mcAssets, atlas))

  app.get('/texture.png', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': atlas.image.length
    })
    res.end(atlas.image)
  })

  app.get('/blocksStates.json', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(blocksStates)
  })
}

module.exports = {
  makeTextureAtlas,
  setupRoutes
}
