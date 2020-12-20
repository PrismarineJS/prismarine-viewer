const THREE = require('three')

function getEntityMesh (entity) {
  if (entity.type === 'player') {
    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6)
    geometry.translate(0, 0.9, 0)
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff })
    const cube = new THREE.Mesh(geometry, material)
    return cube
  } else if (entity.type === 'object') {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    geometry.translate(0, 0.1, 0)
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const cube = new THREE.Mesh(geometry, material)
    return cube
  }
  // g(entity.type)
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  geometry.translate(0, 0.5, 0)
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
  }
}

module.exports = { Entities }
