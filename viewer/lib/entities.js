const THREE = require('three')

const Entity = require('./entity/Entity')

function getEntityMesh (entity) {
  if (entity.type === 'player') {
    const e = new Entity('geometry.humanoid.custom:geometry.humanoid')
    return e.mesh
  } else if (entity.type === 'object') {
    const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
    geometry.translate(0, entity.height / 2, 0)
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(geometry, material)
    return cube
  }
  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
  const cube = new THREE.Mesh(geometry, material)
  return cube
}

class Entities {
  constructor (scene) {
    this.scene = scene
    this.entities = {}
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
    }
    this.entities = {}
  }

  update (entity) {
    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity)
      if (!mesh) return
      this.entities[entity.id] = mesh
      this.scene.add(mesh)
    }

    const e = this.entities[entity.id]

    if (entity.delete) {
      this.scene.remove(e)
      delete this.entities[entity.id]
    }

    if (entity.pos) e.position.set(entity.pos.x, entity.pos.y, entity.pos.z)
    if (entity.yaw) e.rotation.y = entity.yaw + Math.PI
  }
}

module.exports = { Entities }
