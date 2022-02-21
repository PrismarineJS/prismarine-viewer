const path = require('path')
const compression = require('compression')
const express = require('express')
const fetch = require('node-fetch')
const fs = require('fs')

function setupRoutes (app, prefix = '') {
  app.use(compression())
  app.use(prefix + '/', express.static(path.join(__dirname, '../public')))
  app.get('/getSkin', (req, res) => {
    if (!req.query.name) return res.status(400).send('Missing url')
    const name = req.query.name

    fetch('https://api.ashcon.app/mojang/v2/user/' + name)
      .then(res => res.json())
      .then(json => {
        if (!json.textures.skin.url) {
          const fileData = fs.readFileSync(path.join(__dirname, '../public/steve.png'))
          const skinBuffer = Buffer.from(fileData, 'binary')
          res.set('Content-Type', 'image/png').send(skinBuffer)
          return
        }
        const url = json.textures.skin.url

        fetch(url)
          .then(res => res.buffer())
          .then(buffer => {
            res.set('Content-Type', 'image/png')
            res.send(buffer)
          })
      })
      .catch(err => {
        console.error(err)
        res.status(500).send('Error')
      })
  })
}

module.exports = {
  setupRoutes
}
