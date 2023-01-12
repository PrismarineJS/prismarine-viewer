const THREE = require('three')

function dispose3 (o) {
  try {
    if (o && typeof o === 'object') {
      if (Array.isArray(o)) {
        o.forEach(dispose3)
      } else if (o instanceof THREE.Object3D) {
        dispose3(o.geometry)
        dispose3(o.material)
        if (o.parent) {
          o.parent.remove(o)
        }
        dispose3(o.children)
      } else if (o instanceof THREE.BufferGeometry) {
        o.dispose()
      } else if (o instanceof THREE.Material) {
        o.dispose()
        dispose3(o.materials)
        dispose3(o.map)
        dispose3(o.lightMap)
        dispose3(o.bumpMap)
        dispose3(o.normalMap)
        dispose3(o.specularMap)
        dispose3(o.envMap)
      } else if (typeof o.dispose === 'function') {
        o.dispose()
      } else {
        Object.values(o).forEach(dispose3)
      }
    }
  } catch (error) {
    console.log(error)
  }
}

module.exports = { dispose3 }
