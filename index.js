module.exports = function (bot) {
  const port = 3000

  const path = require('path')
  const express = require('express')
  const expressBrowserify = require('express-browserify')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http)

  app.use('/', express.static(path.join(__dirname, 'public')))

  app.get('/index.js', expressBrowserify('src/index.js'))

  io.on('connection', (socket) => {
    socket.emit('version', bot.version)

    const maxViewDistance = 32
    const x = Math.floor(bot.entity.position.x / 16) * 16
    const z = Math.floor(bot.entity.position.z / 16) * 16

    for (const coords in bot._columns) {
      const [cx, cz] = coords.split(',')
      const dx = parseInt(cx, 10) - x
      const dz = parseInt(cz, 10) - z
      if (dx * dx + dz * dz < maxViewDistance * maxViewDistance) {
        const chunk = bot._columns[coords].toJson()
        socket.emit('chunk', { coords, chunk })
      }
    }

    botPosition()

    for (const e in bot.entities) {
      if (bot.entities[e] !== bot.entity) {
        createEntity(bot.entities[e])
      }
    }

    function botPosition () {
      socket.emit('position', bot.entity.position)
    }

    function createEntity (e) {
      socket.emit('entity', { id: e.id, type: e.type, pos: e.position })
    }

    function updateEntity (e) {
      socket.emit('entity', { id: e.id, pos: e.position })
    }

    function removeEntity (e) {
      socket.emit('entity', { id: e.id, delete: true })
    }

    bot.on('move', botPosition)
    bot.on('entitySpawn', createEntity)
    bot.on('entityMoved', updateEntity)
    bot.on('entityGone', removeEntity)

    socket.on('disconnect', () => {
      bot.removeListener('move', botPosition)
      bot.removeListener('entitySpawn', createEntity)
      bot.removeListener('entityMoved', updateEntity)
      bot.removeListener('entityGone', removeEntity)
    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer web server running on *:${port}`)
  })
}
