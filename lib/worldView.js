const { spiral, ViewRect, chunkPos } = require('./utils')
const { Vec3 } = require('vec3')
const EventEmitter = require('events')

class WorldView extends EventEmitter {
  constructor (world, viewDistance, position = new Vec3(0, 0, 0)) {
    super()
    this.world = world
    this.viewDistance = viewDistance
    this.loadedChunks = {}
    this.lastPos = new Vec3(0, 0, 0).update(position)
  }

  init (pos) {
    const [botX, botZ] = chunkPos(pos)
    spiral(this.viewDistance * 2, this.viewDistance * 2, (x, z) => {
      this.loadChunk(new Vec3((botX + x) * 16, 0, (botZ + z) * 16))
    })
    this.lastPos.update(pos)
  }

  loadChunk (pos) {
    const [botX, botZ] = chunkPos(this.lastPos)
    const dx = Math.abs(botX - Math.floor(pos.x / 16))
    const dz = Math.abs(botZ - Math.floor(pos.z / 16))
    if (dx < this.viewDistance && dz < this.viewDistance) {
      const column = this.world.getColumnAt(pos)
      if (column) {
        const chunk = column.toJson()
        this.emit('loadChunk', { x: pos.x, z: pos.z, chunk })
        this.loadedChunks[`${pos.x},${pos.z}`] = true
      }
    }
  }

  unloadChunk (pos) {
    this.emit('unloadChunk', { x: pos.x, z: pos.z })
    delete this.loadedChunks[`${pos.x},${pos.z}`]
  }

  updatePosition (pos) {
    const [lastX, lastZ] = chunkPos(this.lastPos)
    const [botX, botZ] = chunkPos(pos)
    if (lastX !== botX || lastZ !== botZ) {
      const newView = new ViewRect(botX, botZ, this.viewDistance)
      for (const coords of Object.keys(this.loadedChunks)) {
        const x = parseInt(coords.split(',')[0])
        const z = parseInt(coords.split(',')[1])
        const p = new Vec3(x, 0, z)
        if (!newView.contains(Math.floor(x / 16), Math.floor(z / 16))) {
          this.unloadChunk(p)
        }
      }
      spiral(this.viewDistance * 2, this.viewDistance * 2, (x, z) => {
        const p = new Vec3((botX + x) * 16, 0, (botZ + z) * 16)
        if (!this.loadedChunks[`${p.x},${p.z}`]) {
          this.loadChunk(p)
        }
      })
    }
    this.lastPos.update(pos)
  }
}

module.exports = { WorldView }
