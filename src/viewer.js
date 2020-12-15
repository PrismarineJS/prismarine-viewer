
const THREE = require('three')
const { WorldRenderer } = require('./worldrenderer')
const { Entities } = require('./entities')
const { Primitives } = require('./primitives')
const { getVersion } = require('./version')

class Viewer {
  constructor (renderer) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('lightblue')

    const ambientLight = new THREE.AmbientLight(0xcccccc)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(1, 1, 0.5).normalize()
    this.scene.add(directionalLight)

    const size = renderer.getSize()
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)

    this.world = new WorldRenderer(this.scene)
    this.entities = new Entities(this.scene)
    this.primitives = new Primitives(this.scene, this.camera)
  }

  setVersion (version) {
    version = getVersion(version)
    console.log('Using version: ' + version)
    this.world.setVersion(version)
    this.entities.clear()
    this.primitives.clear()
  }

  addColumn (x, z, chunk) {
    this.world.addColumn(x, z, chunk)
  }

  removeColumn (x, z) {
    this.world.removeColumn(x, z)
  }

  setBlockStateId (pos, stateId) {
    this.world.setBlockStateId(pos, stateId)
  }

  updateEntity (e) {
    this.entities.update(e)
  }

  updatePrimitive (p) {
    this.primitives.update(p)
  }

  setFirstPersonCamera (pos, yaw, pitch) {
    this.camera.position.set(pos.x, pos.y + 1.6, pos.z)
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  }
}

module.exports = { Viewer }
