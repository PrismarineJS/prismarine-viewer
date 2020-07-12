/* global THREE XMLHttpRequest */

const { Vec3 } = require('vec3')

const { getSectionGeometry } = require('./models')

function columnKey (x, z) {
  return `${x},${z}`
}

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

function posInChunk (pos) {
  pos = pos.floored()
  pos.x &= 15
  pos.y &= 255
  pos.z &= 15
  return pos
}

function getJSON (url, callback) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'json'
  xhr.onload = function () {
    var status = xhr.status
    if (status === 200) {
      callback(null, xhr.response)
    } else {
      callback(status, xhr.response)
    }
  }
  xhr.send()
}

class World {
  constructor (scene) {
    this.columns = {}
    this.sectionMeshs = {}
    this.scene = scene

    const texture = new THREE.TextureLoader().load('texture.png')
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.flipY = false
    this.material = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true, transparent: true, alphaTest: 0.1 })

    this.blocksStates = null
    getJSON('blocksStates.json', (err, json) => {
      if (err) return
      this.blocksStates = json
    })
  }

  setSectionDirty (pos) {
    const x = Math.floor(pos.x / 16) * 16
    const y = Math.floor(pos.y / 16) * 16
    const z = Math.floor(pos.z / 16) * 16
    const key = sectionKey(x, y, z)
    const mesh = this.sectionMeshs[key]
    if (mesh) {
      this.scene.remove(mesh)
      delete this.sectionMeshs[key]
    }
  }

  addColumn (x, z, chunk) {
    this.columns[columnKey(x, z)] = chunk
    for (let y = 0; y < 256; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z))
    }
  }

  update () {
    if (!this.blocksStates) return // not ready yet

    for (const coords in this.columns) {
      let [x, z] = coords.split(',')
      x = parseInt(x, 10)
      z = parseInt(z, 10)
      const chunk = this.columns[coords]
      for (let y = 0; y < 256; y += 16) {
        if (chunk.sections[Math.floor(y / 16)] && !this.sectionMeshs[sectionKey(x, y, z)]) {
          const geometry = getSectionGeometry(x, y, z, this)
          const mesh = new THREE.Mesh(geometry, this.material)
          this.sectionMeshs[sectionKey(x, y, z)] = mesh
          this.scene.add(mesh)
        }
      }
    }
  }

  setBlockStateId (pos, stateId) {
    const loc = pos.floored()
    const key = columnKey(Math.floor(loc.x / 16) * 16, Math.floor(loc.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return

    column.setBlockStateId(posInChunk(loc), stateId)

    this.setSectionDirty(loc)
    this.setSectionDirty(loc.offset(-16, 0, 0))
    this.setSectionDirty(loc.offset(16, 0, 0))
    this.setSectionDirty(loc.offset(0, -16, 0))
    this.setSectionDirty(loc.offset(0, 16, 0))
    this.setSectionDirty(loc.offset(0, 0, -16))
    this.setSectionDirty(loc.offset(0, 0, 16))
  }

  getBlock (pos) {
    const loc = pos.floored()
    const key = columnKey(Math.floor(loc.x / 16) * 16, Math.floor(loc.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return null

    const block = column.getBlock(posInChunk(loc))
    block.position = loc
    return block
  }
}

module.exports = { World }
