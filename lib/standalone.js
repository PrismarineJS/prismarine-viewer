const { Vec3 } = require('vec3')

function defaultGenerator (x, y, z) { return 0 }

module.exports = ({ version = '1.13.2', generator = defaultGenerator, center = new Vec3(0, 0, 0), viewDistance = 4, port = 3000, prefix = '' }) => {
  const express = require('express')

  const app = express()
  const http = require('http').createServer(app)

  const io = require('socket.io')(http)

  const World = require('prismarine-world')(version)
  const Chunk = require('prismarine-chunk')(version)

  const { setupRoutes } = require('./common')
  setupRoutes(app, prefix)

  const sockets = []
  const viewer = {
    world: new World((chunkX, chunkZ) => {
      const chunk = new Chunk()
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 16; x++) {
          for (let z = 0; z < 16; z++) {
            chunk.setBlockStateId(new Vec3(x, y, z), generator(chunkX * 16 + x, y, chunkZ * 16 + z))
          }
        }
      }
      return chunk
    })
  }

  async function sendChunks (sockets) {
    const cx = Math.floor(center.x / 16) * 16
    const cz = Math.floor(center.z / 16) * 16

    for (let x = cx - viewDistance; x <= cx + viewDistance; x++) {
      for (let z = cz - viewDistance; z <= cz + viewDistance; z++) {
        const coords = `${x * 16},${z * 16}`
        const chunk = (await viewer.world.getColumn(x, z)).toJson()
        for (const socket of sockets) {
          socket.emit('chunk', { coords, chunk })
        }
      }
    }
  }

  viewer.update = () => {
    sendChunks(sockets)
  }

  io.on('connection', (socket) => {
    socket.emit('version', version)
    sockets.push(socket)

    sendChunks([socket])
    socket.emit('position', { pos: center, addMesh: false })

    socket.on('disconnect', () => {
      sockets.splice(sockets.indexOf(socket), 1)
    })
  })

  http.listen(port, () => {
    console.log(`Prismarine viewer web server running on *:${port}`)
  })

  return viewer
}
