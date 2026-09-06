const THREE = require('three')
const entities = require('./entities.json')
const { defaultHost } = require('../host')
const { textureFromPixels, loadPixels, loadTexture } = require('../textures')

const elemFaces = {
  up: {
    dir: [0, 1, 0],
    u0: [0, 0, 1],
    v0: [0, 0, 0],
    u1: [1, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0],
      [0, 1, 0, 0, 1],
      [1, 1, 0, 1, 1]
    ]
  },
  down: {
    dir: [0, -1, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 0],
    u1: [2, 0, 1],
    v1: [0, 0, 1],
    corners: [
      [1, 0, 1, 1, 0],
      [0, 0, 1, 0, 0],
      [1, 0, 0, 1, 1],
      [0, 0, 0, 0, 1]
    ]
  },
  east: {
    dir: [1, 0, 0],
    u0: [1, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [1, 1, 1, 1, 0],
      [1, 0, 1, 1, 1],
      [1, 1, 0, 0, 0],
      [1, 0, 0, 0, 1]
    ]
  },
  west: {
    dir: [-1, 0, 0],
    u0: [0, 0, 0],
    v0: [0, 0, 1],
    u1: [0, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [0, 1, 0, 1, 0],
      [0, 0, 0, 1, 1],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 1]
    ]
  },
  north: {
    dir: [0, 0, -1],
    u0: [0, 0, 1],
    v0: [0, 0, 1],
    u1: [1, 0, 1],
    v1: [0, 1, 1],
    corners: [
      [1, 0, 0, 1, 1],
      [0, 0, 0, 0, 1],
      [1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0]
    ]
  },
  south: {
    dir: [0, 0, 1],
    u0: [1, 0, 2],
    v0: [0, 0, 1],
    u1: [2, 0, 2],
    v1: [0, 1, 1],
    corners: [
      [0, 0, 1, 1, 1],
      [1, 0, 1, 0, 1],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 0, 0]
    ]
  }
}

function dot (a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function addCube (attr, boneId, bone, cube, texWidth = 64, texHeight = 64) {
  const cubeRotation = new THREE.Euler(0, 0, 0)
  if (cube.rotation) {
    cubeRotation.x = -cube.rotation[0] * Math.PI / 180
    cubeRotation.y = -cube.rotation[1] * Math.PI / 180
    cubeRotation.z = -cube.rotation[2] * Math.PI / 180
  }
  for (const { dir, corners, u0, v0, u1, v1 } of Object.values(elemFaces)) {
    const ndx = Math.floor(attr.positions.length / 3)

    for (const pos of corners) {
      const u = (cube.uv[0] + dot(pos[3] ? u1 : u0, cube.size)) / texWidth
      const v = (cube.uv[1] + dot(pos[4] ? v1 : v0, cube.size)) / texHeight

      const inflate = cube.inflate ? cube.inflate : 0
      let vecPos = new THREE.Vector3(
        cube.origin[0] + pos[0] * cube.size[0] + (pos[0] ? inflate : -inflate),
        cube.origin[1] + pos[1] * cube.size[1] + (pos[1] ? inflate : -inflate),
        cube.origin[2] + pos[2] * cube.size[2] + (pos[2] ? inflate : -inflate)
      )

      vecPos = vecPos.applyEuler(cubeRotation)
      vecPos = vecPos.sub(bone.position)
      vecPos = vecPos.applyEuler(bone.rotation)
      vecPos = vecPos.add(bone.position)

      attr.positions.push(vecPos.x, vecPos.y, vecPos.z)
      attr.normals.push(...dir)
      attr.uvs.push(u, v)
      attr.skinIndices.push(boneId, 0, 0, 0)
      attr.skinWeights.push(1, 0, 0, 0)
    }

    attr.indices.push(
      ndx, ndx + 1, ndx + 2,
      ndx + 2, ndx + 1, ndx + 3
    )
  }
}

function applyTexture (material, texture) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  material.map = texture
  material.needsUpdate = true
}

// [x, y, dx, dy, w, h]: the w*h block at (x, y) is copied to (x + dx, y + dy), mirrored horizontally
const legacySkinCopies = [
  [4, 16, 16, 32, 4, 4], [8, 16, 16, 32, 4, 4], [0, 20, 24, 32, 4, 12], [4, 20, 16, 32, 4, 12], [8, 20, 8, 32, 4, 12], [12, 20, 16, 32, 4, 12],
  [44, 16, -8, 32, 4, 4], [48, 16, -8, 32, 4, 4], [40, 20, 0, 32, 4, 12], [44, 20, -8, 32, 4, 12], [48, 20, -16, 32, 4, 12], [52, 20, -8, 32, 4, 12]
]

// Same steps as vanilla's HttpTexture.processLegacySkin. Skins predating 1.8 are 64x32 and
// the player geometry samples a 64x64 sheet: the left limbs become mirrored copies of the
// right ones, and an overlay block with no transparency at all was never used as a hat, so
// its hat rows are dropped. Every skin then gets its base layers forced opaque (head, body
// row, lower limbs), which is what makes the second layer the only see-through one. Capes are
// 64x32 by design and never pass through here.
function prepareSkin (image) {
  if (image.width !== 64 || (image.height !== 32 && image.height !== 64)) return image
  const src = image.data
  const out = new Uint8Array(64 * 64 * 4)
  out.set(src)
  const at = (x, y) => (y * 64 + x) * 4
  if (image.height === 32) {
    for (const [x, y, dx, dy, w, h] of legacySkinCopies) {
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          out.set(src.subarray(at(x + i, y + j), at(x + i, y + j) + 4), at(x + dx + w - 1 - i, y + dy + j))
        }
      }
    }
    let opaque = true
    for (let y = 0; y < 32 && opaque; y++) for (let x = 32; x < 64; x++) if (out[at(x, y) + 3] < 128) { opaque = false; break }
    if (opaque) for (let y = 0; y < 16; y++) for (let x = 32; x < 64; x++) out[at(x, y) + 3] = 0
  }
  for (const [x0, y0, x1, y1] of [[0, 0, 32, 16], [0, 16, 64, 32], [16, 48, 48, 64]]) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out[at(x, y) + 3] = 255
  }
  return { width: 64, height: 64, data: out }
}

function getMesh (texture, jsonModel, override, host) {
  const bones = {}

  const geoData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    skinIndices: [],
    skinWeights: []
  }
  let i = 0
  for (const jsonBone of jsonModel.bones) {
    const bone = new THREE.Bone()
    bone.name = jsonBone.name
    if (jsonBone.pivot) {
      bone.position.x = jsonBone.pivot[0]
      bone.position.y = jsonBone.pivot[1]
      bone.position.z = jsonBone.pivot[2]
    }
    if (jsonBone.bind_pose_rotation) {
      bone.rotation.x = -jsonBone.bind_pose_rotation[0] * Math.PI / 180
      bone.rotation.y = -jsonBone.bind_pose_rotation[1] * Math.PI / 180
      bone.rotation.z = -jsonBone.bind_pose_rotation[2] * Math.PI / 180
    } else if (jsonBone.rotation) {
      bone.rotation.x = -jsonBone.rotation[0] * Math.PI / 180
      bone.rotation.y = -jsonBone.rotation[1] * Math.PI / 180
      bone.rotation.z = -jsonBone.rotation[2] * Math.PI / 180
    }
    bones[jsonBone.name] = bone

    if (jsonBone.cubes) {
      for (const cube of jsonBone.cubes) {
        addCube(geoData, i, bone, cube, jsonModel.texturewidth, jsonModel.textureheight)
      }
    }
    i++
  }

  const rootBones = []
  for (const jsonBone of jsonModel.bones) {
    if (jsonBone.parent) {
      const parentPivot = jsonModel.bones.find(b => b.name === jsonBone.parent).pivot
      const bone = bones[jsonBone.name]
      // pivots are absolute in the json, bone positions are relative to the parent
      if (parentPivot) bone.position.sub(new THREE.Vector3(...parentPivot))
      bones[jsonBone.parent].add(bone)
    } else rootBones.push(bones[jsonBone.name])
  }

  const skeleton = new THREE.Skeleton(Object.values(bones))

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(geoData.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geoData.normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geoData.uvs, 2))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(geoData.skinIndices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(geoData.skinWeights, 4))
  geometry.setIndex(geoData.indices)

  const material = new THREE.MeshLambertMaterial({ transparent: true, skinning: true, alphaTest: 0.1 })
  const mesh = new THREE.SkinnedMesh(geometry, material)
  mesh.add(...rootBones)
  mesh.bind(skeleton)
  // Model space is x-mirrored relative to the world (Bedrock geometry, same as Java's model
  // space, which vanilla draws under a (-1, -1, 1) scale): the left arm sits at +x. Flip it
  // so the player's left limbs end up on their left; the face UVs below are laid out for this.
  mesh.scale.set(-1 / 16, 1 / 16, 1 / 16)

  // Textures load the first time the mesh is drawn, so an entity the camera
  // never sees (a player across the server) costs no fetch.
  mesh.onBeforeRender = () => {
    mesh.onBeforeRender = () => {}
    const apply = texture => { if (texture) applyTexture(material, texture) }
    if (texture) {
      loadTexture(host, texture).then(texture => {
        apply(texture)
        if (override) loadPixels(host, override).then(pixels => { if (pixels) applyTexture(material, textureFromPixels(prepareSkin(pixels))) })
      })
    } else {
      loadTexture(host, override).then(apply)
    }
  }

  return mesh
}

class Entity {
  constructor (version, type, scene, textures = {}, host = defaultHost()) {
    const e = entities[type]
    if (!e) throw new Error(`Unknown entity ${type}`)

    this.mesh = new THREE.Object3D()
    for (const [name, jsonModel] of Object.entries(e.geometry)) {
      const texture = e.textures[name]
      if (!texture && !textures[name]) continue
      // console.log(JSON.stringify(jsonModel, null, 2))
      const mesh = getMesh(texture && texture.replace('textures', 'textures/' + version) + '.png', jsonModel, textures[name], host)
      /* const skeletonHelper = new THREE.SkeletonHelper( mesh )
      skeletonHelper.material.linewidth = 2
      scene.add( skeletonHelper ) */
      this.mesh.add(mesh)
    }
  }
}

module.exports = Entity
