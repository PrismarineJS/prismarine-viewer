const path = require('path')
const compression = require('compression')
const express = require('express')
const fetch = require('node-fetch')

function setupRoutes (app, prefix = '') {
  app.use(compression())
  app.use(prefix + '/', express.static(path.join(__dirname, '../public')))
  app.get("/getGraphics", (req, res) => {
    if (!req.query.url) return res.status(400).send('Missing url')
    const url = req.query.url
    // fetch the url to an image and send this to the client
    fetch(url)
      .then(res => res.buffer())
      .then(buffer => {
        res.set('Content-Type', 'image/png')
        res.send(buffer)
      })
  })
}

module.exports = {
  setupRoutes
}
