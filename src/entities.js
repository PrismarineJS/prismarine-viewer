/* global THREE */

function getEntityMesh (entity) {
  const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6)
  geometry.translate(0, 0.9, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0x0000ff })
  const cube = new THREE.Mesh(geometry, material)
  return cube
}

class Entities {
  constructor (scene) {
    this.scene = scene
    this.entities = {}
  }

  update (entity) {
    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity)
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
