const { Vec3 } = require('vec3')
const EventEmitter = require('events')

module.exports = ({ version, world, center = new Vec3(0, 0, 0), viewDistance = 4, port = 3000, prefix = '' }) => {
  const express = require('express')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http, { path: prefix + '/socket.io' })

  const { setupRoutes } = require('./common')
  setupRoutes(app, prefix)

  const sockets = []
  const primitives = {}

  const viewer = new EventEmitter()
  viewer.world = world

  async function sendChunks (sockets) {
    const cx = Math.floor(center.x / 16)
    const cz = Math.floor(center.z / 16)

    // Use Promise.all for potentially faster loading, though sequential might be gentler
    const chunkPromises = []
    for (let x = cx - viewDistance; x <= cx + viewDistance; x++) {
      for (let z = cz - viewDistance; z <= cz + viewDistance; z++) {
        chunkPromises.push(
          viewer.world.getColumn(x, z)
            .then(column => {
              if (!column) return null
              return { x: x * 16, z: z * 16, chunk: column.toJson() }
            })
            .catch(err => {
              console.error(`Error getting column ${x},${z}:`, err)
              return null
            })
        )
      }
    }

    const chunkDataArray = (await Promise.all(chunkPromises)).filter(Boolean)

    for (const socket of sockets) {
      for (const chunkData of chunkDataArray) {
        socket.emit('loadChunk', chunkData)
      }
    }
  }

  // Method to potentially update world view if center/viewDistance changes or world data updates
  // Note: This only resends chunks, primitive updates happen immediately via draw methods.
  viewer.update = () => {
    sendChunks(sockets)
  }

  // Drawing methods

  viewer.erase = (id) => {
    delete primitives[id]
    // Emit an empty primitive object with the ID to signal deletion
    for (const socket of sockets) {
      socket.emit('primitive', { id })
    }
  }

  viewer.drawBoxGrid = (id, start, end, color = 'aqua') => {
    primitives[id] = { type: 'boxgrid', id, start, end, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  viewer.drawLine = (id, points, color = 0xff0000) => {
    primitives[id] = { type: 'line', id, points, color }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  viewer.drawPoints = (id, points, color = 0xff0000, size = 5) => {
    primitives[id] = { type: 'points', id, points, color, size }
    for (const socket of sockets) {
      socket.emit('primitive', primitives[id])
    }
  }

  // Socket Handling

  io.on('connection', (socket) => {
    socket.emit('version', version)
    sockets.push(socket)

    sendChunks([socket])
    socket.emit('position', { pos: center, addMesh: false })

    // Send existing primitives to the new client
    for (const id in primitives) {
      socket.emit('primitive', primitives[id])
    }

    // Handle client disconnect
    socket.on('disconnect', () => {
      sockets.splice(sockets.indexOf(socket), 1)
    })
  })

  // Server Start

  http.listen(port, () => {
    console.log(`Prismarine viewer web server running on *:${port}`)
  })

  viewer.close = () => {
    http.close()
    for (const socket of sockets) {
      socket.disconnect()
    }
  }

  return viewer
}
