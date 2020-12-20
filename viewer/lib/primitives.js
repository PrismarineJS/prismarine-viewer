const THREE = require('three')
const { MeshLine, MeshLineMaterial } = require('three.meshline')

function getMesh (primitive, camera) {
  if (primitive.type === 'line') {
    const color = primitive.color ? primitive.color : 0xff0000
    const resolution = new THREE.Vector2(window.innerWidth / camera.zoom, window.innerHeight / camera.zoom)
    const material = new MeshLineMaterial({ color, resolution, sizeAttenuation: false, lineWidth: 8 })

    const points = []
    for (const p of primitive.points) {
      points.push(p.x, p.y, p.z)
    }

    const line = new MeshLine()
    line.setPoints(points)
    return new THREE.Mesh(line, material)
  }
  return null
}

class Primitives {
  constructor (scene, camera) {
    this.scene = scene
    this.camera = camera
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

    const mesh = getMesh(primitive, this.camera)
    if (!mesh) return
    this.primitives[primitive.id] = mesh
    this.scene.add(mesh)
  }
}

module.exports = { Primitives }
