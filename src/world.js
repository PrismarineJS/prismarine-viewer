/* global THREE */

const Vec3 = require('vec3').Vec3

const cubeFaces = [
  { // left
    dir: new Vec3(-1, 0, 0),
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 1, 1],
      [0, 0, 1]
    ]
  },
  { // right
    dir: new Vec3(1, 0, 0),
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 0, 0]
    ]
  },
  { // bottom
    dir: new Vec3(0, -1, 0),
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 1],
      [0, 0, 1],
      [1, 0, 0],
      [0, 0, 0]
    ]
  },
  { // top
    dir: new Vec3(0, 1, 0),
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [0, 1, 0],
      [1, 1, 0]
    ]
  },
  { // back
    dir: new Vec3(0, 0, -1),
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  },
  { // front
    dir: new Vec3(0, 0, 1),
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1]
    ]
  }
]

function columnKey (x, z) {
  return `${x},${z}`
}

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

function posInChunk (pos) {
  pos = pos.floored()
  pos.x &= 15
  pos.y &= 255
  pos.z &= 15
  return pos
}

function isCube (shapes) {
  if (shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

function addUvs (uvs, blockIndex, textureWidth) {
  const tileS = 16 / textureWidth
  const tileN = Math.floor(textureWidth / 16)
  const x = (blockIndex % tileN) * tileS
  const y = Math.floor(blockIndex / tileN) * tileS
  uvs.push(x, y, x, y + tileS, x + tileS, y, x + tileS, y + tileS)
}

function getSectionMesh (sx, sy, sz, world) {
  const texture = new THREE.TextureLoader().load('texture.png')
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.flipY = false

  const positions = []
  const normals = []
  const colors = []
  const uvs = []
  const indices = []

  const cursor = new Vec3(0, 0, 0)
  for (cursor.y = sy; cursor.y < sy + 16; cursor.y++) {
    for (cursor.z = sz; cursor.z < sz + 16; cursor.z++) {
      for (cursor.x = sx; cursor.x < sx + 16; cursor.x++) {
        const block = world.getBlock(cursor)
        if (block && block.shapes.length > 0) {
          if (isCube(block.shapes)) {
            for (const { dir, corners, mask1, mask2 } of cubeFaces) {
              const neighbor = world.getBlock(cursor.plus(dir))
              if (neighbor && !isCube(neighbor.shapes) && neighbor.position.y >= 0) {
                const ndx = Math.floor(positions.length / 3)
                const aos = []
                for (const pos of corners) {
                  positions.push(pos[0] + cursor.x, pos[1] + cursor.y, pos[2] + cursor.z)
                  normals.push(dir.x, dir.y, dir.z)

                  // Ambient occlusion
                  const dx = pos[0] * 2 - 1
                  const dy = pos[1] * 2 - 1
                  const dz = pos[2] * 2 - 1
                  const side1 = world.getBlock(cursor.offset(dx * mask1[0], dy * mask1[1], dz * mask1[2]))
                  const side2 = world.getBlock(cursor.offset(dx * mask2[0], dy * mask2[1], dz * mask2[2]))
                  const corner = world.getBlock(cursor.offset(dx, dy, dz))

                  const side1Block = (side1 && isCube(side1.shapes)) ? 1 : 0
                  const side2Block = (side2 && isCube(side2.shapes)) ? 1 : 0
                  const cornerBlock = (corner && isCube(corner.shapes)) ? 1 : 0

                  const ao = (side1Block && side2Block) ? 0 : (3 - (side1Block + side2Block + cornerBlock))
                  aos.push(ao)

                  colors.push(ao / 3, ao / 3, ao / 3)
                }
                addUvs(uvs, block.type, 400) // TODO: correct uvs
                if (aos[0] + aos[3] < aos[1] + aos[2]) {
                  indices.push(
                    ndx, ndx + 1, ndx + 2,
                    ndx + 2, ndx + 1, ndx + 3
                  )
                } else {
                  indices.push(
                    ndx, ndx + 3, ndx + 2,
                    ndx, ndx + 1, ndx + 3
                  )
                }
              }
            }
          } else {
            for (const shape of block.shapes) {
              for (const { dir, corners } of cubeFaces) {
                const ndx = Math.floor(positions.length / 3)
                for (const pos of corners) {
                  positions.push((pos[0] ? shape[3] : shape[0]) + cursor.x, (pos[1] ? shape[4] : shape[1]) + cursor.y, (pos[2] ? shape[5] : shape[2]) + cursor.z)
                  normals.push(dir.x, dir.y, dir.z)
                  colors.push(1, 1, 1)
                }
                addUvs(uvs, block.type, 400) // TODO: correct uvs
                indices.push(
                  ndx, ndx + 1, ndx + 2,
                  ndx + 2, ndx + 1, ndx + 3
                )
              }
            }
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  const material = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true })
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(indices)
  return new THREE.Mesh(geometry, material)
}

class World {
  constructor (scene) {
    this.columns = {}
    this.sectionMeshs = {}
    this.scene = scene
  }

  setSectionDirty (pos) {
    const x = Math.floor(pos.x / 16) * 16
    const y = Math.floor(pos.y / 16) * 16
    const z = Math.floor(pos.z / 16) * 16
    const key = sectionKey(x, y, z)
    const mesh = this.sectionMeshs[key]
    if (mesh) {
      this.scene.remove(mesh)
      delete this.sectionMeshs[key]
    }
  }

  addColumn (x, z, chunk) {
    this.columns[columnKey(x, z)] = chunk
    for (let y = 0; y < 256; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z))
    }
  }

  update () {
    for (const coords in this.columns) {
      let [x, z] = coords.split(',')
      x = parseInt(x, 10)
      z = parseInt(z, 10)
      const chunk = this.columns[coords]
      for (let y = 0; y < 256; y += 16) {
        if (chunk.sections[Math.floor(y / 16)] && !this.sectionMeshs[sectionKey(x, y, z)]) {
          const mesh = getSectionMesh(x, y, z, this)
          this.sectionMeshs[sectionKey(x, y, z)] = mesh
          this.scene.add(mesh)
        }
      }
    }
  }

  setBlockStateId (pos, stateId) {
    const loc = pos.floored()
    const key = columnKey(Math.floor(loc.x / 16) * 16, Math.floor(loc.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return

    column.setBlockStateId(posInChunk(loc), stateId)

    this.setSectionDirty(loc)
    this.setSectionDirty(loc.offset(-16, 0, 0))
    this.setSectionDirty(loc.offset(16, 0, 0))
    this.setSectionDirty(loc.offset(0, -16, 0))
    this.setSectionDirty(loc.offset(0, 16, 0))
    this.setSectionDirty(loc.offset(0, 0, -16))
    this.setSectionDirty(loc.offset(0, 0, 16))
  }

  getBlock (pos) {
    const loc = pos.floored()
    const key = columnKey(Math.floor(loc.x / 16) * 16, Math.floor(loc.z / 16) * 16)

    const column = this.columns[key]
    // null column means chunk not loaded
    if (!column) return null

    const block = column.getBlock(posInChunk(loc))
    block.position = loc
    return block
  }
}

module.exports = { World }
