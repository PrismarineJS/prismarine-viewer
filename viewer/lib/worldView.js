const { spiral, ViewRect, chunkPos } = require('./simpleUtils')
const { Vec3 } = require('vec3')
const EventEmitter = require('events')

class WorldView extends EventEmitter {
  constructor (world, viewDistance, position = new Vec3(0, 0, 0)) {
    super()
    this.world = world
    this.viewDistance = viewDistance
    this.loadedChunks = {}
    this.lastPos = new Vec3(0, 0, 0).update(position)
    this.emitter = this

    const worldView = this
    this.listeners = {
      // 'move': botPosition,
      entitySpawn: function (e) {
        worldView.emitter.emit('entity', { id: e.id, type: e.type, pos: e.position })
      },
      entityMoved: function (e) {
        worldView.emitter.emit('entity', { id: e.id, pos: e.position })
      },
      entityGone: function (e) {
        worldView.emitter.emit('entity', { id: e.id, delete: true })
      },
      chunkColumnLoad: function (pos) {
        worldView.loadChunk(pos)
      },
      blockUpdate: function (oldBlock, newBlock) {
        const stateId = newBlock.stateId ? newBlock.stateId : ((newBlock.type << 4) | newBlock.metadata)
        worldView.emitter.emit('blockUpdate', { pos: oldBlock.position, stateId })
      }
    }
  }

  forward (emitter) {
    this.emitter = emitter
  }

  listenToBot (bot) {
    for (const [evt, listener] of Object.entries(this.listeners)) {
      bot.on(evt, listener)
    }

    for (const id in bot.entities) {
      const e = bot.entities[id]
      if (e !== bot.entity) {
        this.emitter.emit('entity', { id: e.id, type: e.type, pos: e.position })
      }
    }
  }

  removeListenersFromBot (bot) {
    for (const [evt, listener] of Object.entries(this.listeners)) {
      bot.removeListener(evt, listener)
    }
  }

  init (pos) {
    const [botX, botZ] = chunkPos(pos)
    spiral(this.viewDistance * 2, this.viewDistance * 2, (x, z) => {
      this.loadChunk(new Vec3((botX + x) * 16, 0, (botZ + z) * 16))
    })
    this.lastPos.update(pos)
  }

  async loadChunk (pos) {
    const [botX, botZ] = chunkPos(this.lastPos)
    const dx = Math.abs(botX - Math.floor(pos.x / 16))
    const dz = Math.abs(botZ - Math.floor(pos.z / 16))
    if (dx < this.viewDistance && dz < this.viewDistance) {
      const column = await this.world.getColumnAt(pos)
      if (column) {
        const chunk = column.toJson()
        this.emitter.emit('loadChunk', { x: pos.x, z: pos.z, chunk })
        this.loadedChunks[`${pos.x},${pos.z}`] = true
      }
    }
  }

  unloadChunk (pos) {
    this.emitter.emit('unloadChunk', { x: pos.x, z: pos.z })
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
