const { Vec3 } = require('vec3')
const EventEmitter = require('events')
const { RaycastIterator } = require('mineflayer/lib/iterators')
const { WorldView } = require('../viewer')

module.exports = (bot, { viewDistance = 6, firstPerson = false, port = 3000 }) => {
  const express = require('express')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http)

  const { setupRoutes } = require('./common')
  setupRoutes(app)

  const sockets = []
  const primitives = {}

  bot.viewer = new EventEmitter()

  bot.viewer.erase = (id) => {
    delete primitives[id]
    for (const socket of sockets) {
      socket.emit('primitive', { id })
    }
  }

  bot.viewer.drawLine = (id, points, color = 0xff0000) => {
    primitives[id] = { type: 'line', id, points, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  io.on('connection', (socket) => {
    socket.emit('version', bot.version)
    sockets.push(socket)

    const worldView = new WorldView(bot.world, viewDistance, bot.entity.position)
    worldView.forward(socket)
    worldView.init(bot.entity.position)

    for (const id in primitives) {
      socket.emit('primitive', primitives[id])
    }

    function botPosition () {
      const packet = { pos: bot.entity.position, addMesh: true }
      if (firstPerson) {
        packet.yaw = bot.entity.yaw
        packet.pitch = bot.entity.pitch
      }
      socket.emit('position', packet)
      worldView.updatePosition(bot.entity.position)
    }

    bot.on('move', botPosition)
    worldView.listenToBot(bot)
    socket.on('disconnect', () => {
      bot.removeListener('move', botPosition)
      worldView.removeListenersFromBot(bot)
      sockets.splice(sockets.indexOf(socket), 1)
    })

    const getClickedBlock = (viewPos, viewDir, maxDistance = 256) => {
      const iter = new RaycastIterator(new Vec3(viewPos.x, viewPos.y, viewPos.z), new Vec3(viewDir.x, viewDir.y, viewDir.z), maxDistance)
      let pos = iter.next()
      while (pos) {
        const block = bot.blockAt(new Vec3(pos.x, pos.y, pos.z))
        // TODO: Check boundingBox of block
        if (block && block.type !== 0) {
          return { block, face: pos.face }
        }
        pos = iter.next()
      }
      return { block: null, face: 0 }
    }

    socket.on('mouseClick', (click) => {
      const { block, face } = getClickedBlock(click.origin, click.direction)
      bot.viewer.emit('blockClicked', block, face, click.button)
    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer web server running on *:${port}`)
  })
}
