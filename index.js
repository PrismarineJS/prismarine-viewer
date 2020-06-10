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

    socket.emit('position', bot.entity.position)

    const maxViewDistance = 64
    const x = Math.floor(bot.entity.position.x / 16) * 16
    const z = Math.floor(bot.entity.position.z / 16) * 16

    for (const coords in bot._columns) {
      const [cx, cz] = coords.split(',')
      const dx = cx - x
      const dz = cz - z
      if (dx * dx + dz * dz < maxViewDistance * maxViewDistance) {
        const chunk = bot._columns[coords].toJson()
        socket.emit('chunk', { coords, chunk })
      }
    }

    socket.on('disconnect', () => {

    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer web server running on *:${port}`)
  })
}
