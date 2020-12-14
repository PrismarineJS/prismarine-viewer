const path = require('path')
const compression = require('compression')
const express = require('express')

function setupRoutes (app) {
  app.use(compression())
  app.use('/', express.static(path.join(__dirname, '../public')))
}

module.exports = {
  setupRoutes
}
