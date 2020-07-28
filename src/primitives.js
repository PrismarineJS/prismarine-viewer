/* global THREE */

function getMesh (primitive) {
  if (primitive.type === 'line') {
    const color = primitive.color ? primitive.color : 0xff0000
    const material = new THREE.LineBasicMaterial({ color })

    const points = []
    for (const p of primitive.points) {
      points.push(new THREE.Vector3(p.x, p.y, p.z))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return new THREE.Line(geometry, material)
  }
  return null
}

class Primitives {
  constructor (scene) {
    this.scene = scene
    this.primitives = {}
  }

  clear () {
    for (const mesh of Object.values(this.primitives)) {
      this.scene.remove(mesh)
    }
    this.primitives = {}
  }

  update (primitive) {
    if (this.primitives[primitive.id]) {
      this.scene.remove(this.primitives[primitive.id])
      delete this.primitives[primitive.id]
    }

    const mesh = getMesh(primitive)
    if (!mesh) return
    this.primitives[primitive.id] = mesh
    this.scene.add(mesh)
  }
}

module.exports = { Primitives }
