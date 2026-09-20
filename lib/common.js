const path = require('path')
const compression = require('compression')
const express = require('express')

function setupRoutes (app, prefix = '') {
  // Proxies player skins and capes for the browser (textures.minecraft.net
  // sends no CORS headers). Only that host, by texture hash, so it can't be
  // used as an open proxy.
  app.get(prefix + '/texture/:hash([0-9a-f]+)', async (req, res) => {
    try {
      const texture = await fetch(`https://textures.minecraft.net/texture/${req.params.hash}`)
      if (!texture.ok) return res.sendStatus(texture.status === 404 ? 404 : 502)
      res.type('png').send(Buffer.from(await texture.arrayBuffer()))
    } catch (err) {
      res.sendStatus(502)
    }
  })

  app.use(compression())
  app.use(prefix + '/', express.static(path.join(__dirname, '../public')))
}

module.exports = {
  setupRoutes
}
