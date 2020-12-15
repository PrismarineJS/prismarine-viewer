const { Vec3 } = require('vec3')
const EventEmitter = require('events')
const { RaycastIterator } = require('mineflayer/lib/iterators')
const { WorldView } = require('./worldView')

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
    worldView.on('loadChunk', packet => socket.emit('chunk', packet))
    worldView.on('unloadChunk', packet => socket.emit('unloadChunk', packet))
    worldView.init(bot.entity.position)

    for (const e in bot.entities) {
      if (bot.entities[e] !== bot.entity) {
        createEntity(bot.entities[e])
      }
    }

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

    function createEntity (e) {
      socket.emit('entity', { id: e.id, type: e.type, pos: e.position })
    }

    function updateEntity (e) {
      socket.emit('entity', { id: e.id, pos: e.position })
    }

    function removeEntity (e) {
      socket.emit('entity', { id: e.id, delete: true })
    }

    function blockUpdate (oldBlock, newBlock) {
      const stateId = newBlock.stateId ? newBlock.stateId : ((newBlock.type << 4) | newBlock.metadata)
      socket.emit('blockUpdate', { pos: oldBlock.position, stateId })
    }

    function loadChunk (pos) {
      worldView.loadChunk(pos)
    }

    bot.on('move', botPosition)
    bot.on('entitySpawn', createEntity)
    bot.on('entityMoved', updateEntity)
    bot.on('entityGone', removeEntity)
    bot.on('chunkColumnLoad', loadChunk)
    bot.on('blockUpdate', blockUpdate)

    socket.on('disconnect', () => {
      bot.removeListener('move', botPosition)
      bot.removeListener('entitySpawn', createEntity)
      bot.removeListener('entityMoved', updateEntity)
      bot.removeListener('entityGone', removeEntity)
      bot.removeListener('chunkColumnLoad', loadChunk)
      bot.removeListener('blockUpdate', blockUpdate)
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
