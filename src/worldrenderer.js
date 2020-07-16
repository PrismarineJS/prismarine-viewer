/* global THREE XMLHttpRequest */

const { Vec3 } = require('vec3')

const { getSectionGeometry } = require('./models')
const { World } = require('./world')

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
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

class WorldRenderer {
  constructor (scene) {
    this.world = null
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

  setVersion (version) {
    for (const mesh of Object.values(this.sectionMeshs)) {
      this.scene.remove(mesh)
    }
    this.sectionMeshs = {}
    this.world = new World(version) // TODO: move the world into a worker thread
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

  update () {
    if (!this.blocksStates || !this.world) return // not ready yet

    for (const coords in this.world.columns) {
      let [x, z] = coords.split(',')
      x = parseInt(x, 10)
      z = parseInt(z, 10)
      const chunk = this.world.columns[coords]
      for (let y = 0; y < 256; y += 16) {
        if (chunk.sections[Math.floor(y / 16)] && !this.sectionMeshs[sectionKey(x, y, z)]) {
          const geometry = getSectionGeometry(x, y, z, this.world, this.blocksStates)
          const mesh = new THREE.Mesh(geometry, this.material)
          this.sectionMeshs[sectionKey(x, y, z)] = mesh
          this.scene.add(mesh)
        }
      }
    }
  }

  addColumn (x, z, chunk) {
    this.world.addColumn(x, z, chunk)
    for (let y = 0; y < 256; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z))
    }
  }

  setBlockStateId (pos, stateId) {
    if (this.world.setBlockStateId(pos, stateId)) {
      const loc = pos.floored()
      this.setSectionDirty(loc)
      this.setSectionDirty(loc.offset(-16, 0, 0))
      this.setSectionDirty(loc.offset(16, 0, 0))
      this.setSectionDirty(loc.offset(0, -16, 0))
      this.setSectionDirty(loc.offset(0, 16, 0))
      this.setSectionDirty(loc.offset(0, 0, -16))
      this.setSectionDirty(loc.offset(0, 0, 16))
    }
  }

  getBlock (pos) {
    return this.world.getBlock(pos)
  }
}

module.exports = { WorldRenderer }
