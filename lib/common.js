const path = require('path')
const compression = require('compression')
const express = require('express')
const https = require('https')
const fs = require('fs')
const fetch = require('node-fetch') // Can be removed as soon as native fetch is no longer experimental

function setupRoutes (app, prefix = '') {
  app.use(compression())
  app.use(prefix + '/', express.static(path.join(__dirname, '../public')))
  app.get('/skin', async (req, res) => {
    if (!req.query.username) return res.status(400).send('Missing url')
    const username = req.query.username

    try {
      const uuid = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}?at=${Date.now()}`)
        .then((r) => r.json())
        .then((r) => r.id)
      const r = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`).then((r) => r.json())
      const skinData = JSON.parse(Buffer.from(r.properties[0].value, 'base64').toString('utf8'))
      const url = skinData.textures.SKIN.url.replace('http://', 'https://')
      forwardPlayerSkin(url, res)
    } catch (e) {
      console.log('Was unable to load the player skin', e)
      const fileData = fs.readFileSync(path.join(__dirname, '../public/players/steve.png'))
      const skinBuffer = Buffer.from(fileData, 'binary')
      res.set('Content-Type', 'image/png').send(skinBuffer)
    }
  })
}

function forwardPlayerSkin (url, res) {
  https
    .get(url, (playerSkinRequest) => {
      const data = []
      playerSkinRequest
        .on('data', function (chunk) {
          data.push(chunk)
        })
        .on('end', function () {
          res.set('Content-Type', 'image/png')
          res.send(Buffer.concat(data))
        })
    })
    .on('error', (err) => {
      console.error(err)
      res.status(500).send('Error')
    })
}

module.exports = {
  setupRoutes,
  forwardPlayerSkin
}
