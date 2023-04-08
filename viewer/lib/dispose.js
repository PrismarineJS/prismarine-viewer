const THREE = require('three')

/**
 * Recursively removes objects from the Three.js scene and disposes them from memory.
 * @param {Object} object - The object or group of objects to be removed and disposed from memory.
 * @param {Set} visited - Set of objects already visited to prevent duplicate removals of objects.
 */
function dispose3 (object, visited = new Set()) {
  try {
    if (visited.has(object)) return
    visited.add(object)

    if (object && typeof object === 'object') {
      if (Array.isArray(object)) {
        object.forEach(element => dispose3(element, visited))
      } else {
        disposeObject3D(object, visited)
      }
    }
  } catch (error) {
    console.log(error)
  }
}

function disposeObject3D (object, visited) {
  if (object instanceof THREE.Object3D) {
    dispose3(object.geometry, visited)
    dispose3(object.material, visited)
    removeParent(object)
    dispose3(object.children, visited)
  } else {
    disposeBufferGeometry(object)
    disposeMaterial(object, visited)
    disposeOtherObjects(object, visited)
  }
}

function removeParent (object) {
  if (object.parent) {
    object.parent.remove(object)
  }
}

function disposeBufferGeometry (object) {
  if (object instanceof THREE.BufferGeometry) {
    object.dispose()
  }
}

function disposeMaterial (object, visited) {
  if (object instanceof THREE.Material) {
    object.dispose()
    dispose3(object.materials, visited)
    dispose3(object.map, visited)
    dispose3(object.lightMap, visited)
    dispose3(object.bumpMap, visited)
    dispose3(object.normalMap, visited)
    dispose3(object.specularMap, visited)
    dispose3(object.envMap, visited)
  }
}

function disposeOtherObjects (object, visited) {
  if (typeof object.dispose === 'function') {
    object.dispose()
  } else {
    Object.values(object).forEach(element => dispose3(element, visited))
  }
}

module.exports = { dispose3 }
