const THREE = require('three')

const mobGeometries = require('./mobs.json')
const { loadTexture } = globalThis.isElectron ? require('../utils.electron.js') : require('../utils')

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    u0: [0, 0, 1],
    v0: [0, 0, 0],
    u1: [1, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [0, 1, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0]
    ]
  },
  down: {
    dir: [0, -1, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 0],
    u1: [2, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [1, 0, 1, 0, 1],
      [0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0]
    ]
  },
  east: {
    dir: [1, 0, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    u0: [0, 0, 0],
    v0: [0, 0, 1],
    u1: [0, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    u0: [1, 0, 2],
    v0: [0, 0, 1],
    u1: [2, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    u0: [0, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function dot (a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function addCube (attr, boneId, cube, texWidth = 64, texHeight = 64) {
  for (const { dir, corners, u0, v0, u1, v1 } of Object.values(elemFaces)) {
    const ndx = Math.floor(attr.positions.length / 3)

    for (const pos of corners) {
      const u = (cube.uv[0] + dot(pos[3] ? u1 : u0, cube.size)) / texWidth
      const v = (cube.uv[1] + dot(pos[4] ? v1 : v0, cube.size)) / texHeight

      attr.positions.push(
        cube.origin[0] + pos[0] * cube.size[0],
        cube.origin[1] + pos[1] * cube.size[1],
        cube.origin[2] + pos[2] * cube.size[2]
      )
      attr.normals.push(...dir)
      attr.uvs.push(u, v)
      attr.colors.push(1, 1, 1)
      attr.skinIndices.push(boneId, 0, 0, 0)
      attr.skinWeights.push(1, 0, 0, 0)
    }

    attr.indices.push(
      ndx, ndx + 1, ndx + 2,
      ndx + 2, ndx + 1, ndx + 3
    )
  }
}

class Entity {
  constructor (modelPath) {
    const jsonModel = mobGeometries[modelPath]
    // console.log(JSON.stringify(jsonModel, null, 2))
    this.bones = {}

    const geoData = {
      positions: [],
      normals: [],
      colors: [],
      uvs: [],
      indices: [],
      skinIndices: [],
      skinWeights: []
    }
    let i = 0
    for (const jsonBone of jsonModel.bones) {
      const bone = new THREE.Bone()
      bone.position.x = jsonBone.pivot.x
      bone.position.y = jsonBone.pivot.y
      bone.position.z = jsonBone.pivot.z
      this.bones[jsonBone.name] = bone

      if (jsonBone.cubes) {
        for (const cube of jsonBone.cubes) {
          addCube(geoData, i, cube)
        }
      }
      i++
    }

    for (const jsonBone of jsonModel.bones) {
      if (jsonBone.parent) this.bones[jsonBone.parent].add(this.bones[jsonBone.name])
    }

    this.skeleton = new THREE.Skeleton(Object.values(this.bones))

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(geoData.positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geoData.normals, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(geoData.colors, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geoData.uvs, 2))
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(geoData.skinIndices, 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(geoData.skinWeights, 4))
    geometry.setIndex(geoData.indices)

    this.material = new THREE.MeshBasicMaterial({ transparent: true/* skinning: true, */ })
    this.mesh = new THREE.SkinnedMesh(geometry, this.material)
    this.mesh.bind(this.skeleton)
    this.mesh.scale.set(1 / 16, 1 / 16, 1 / 16)

    loadTexture('textures/entity/steve.png', texture => {
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.flipY = false
      this.material.map = texture
    })
  }
}

module.exports = Entity
