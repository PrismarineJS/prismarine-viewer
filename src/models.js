/* global THREE */

const Vec3 = require('vec3').Vec3

const elemFaces = {
  up: {
    dir: new Vec3(0, 1, 0),
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [0, 1, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0]
    ]
  },
  down: {
    dir: new Vec3(0, -1, 0),
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 1, 0, 1],
      [0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0]
    ]
  },
  east: {
    dir: new Vec3(1, 0, 0),
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    dir: new Vec3(-1, 0, 0),
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    dir: new Vec3(0, 0, -1),
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    dir: new Vec3(0, 0, 1),
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}

function isCube (shapes) {
  if (shapes.length !== 1) return false
  const shape = shapes[0]
  return shape[0] === 0 && shape[1] === 0 && shape[2] === 0 && shape[3] === 1 && shape[4] === 1 && shape[5] === 1
}

function renderElement (world, cursor, element, doAO, attr) {
  for (const face in element.faces) {
    const eFace = element.faces[face]
    const { dir, corners, mask1, mask2 } = elemFaces[face]

    if (eFace.cullface) {
      const neighbor = world.getBlock(cursor.plus(dir))
      if (!neighbor || !(neighbor.transparent || !isCube(neighbor.shapes)) || neighbor.position.y < 0) continue
    }

    const minx = element.from[0] / 16
    const miny = element.from[1] / 16
    const minz = element.from[2] / 16
    const maxx = element.to[0] / 16
    const maxy = element.to[1] / 16
    const maxz = element.to[2] / 16

    const u = eFace.texture.u
    const v = eFace.texture.v
    const su = eFace.texture.su
    const sv = eFace.texture.sv

    const ndx = Math.floor(attr.positions.length / 3)

    let tint = [1, 1, 1]
    if (eFace.tintindex !== undefined) {
      if (eFace.tintindex === 0) {
        tint = [0.568, 0.741, 0.349] // TODO: correct tint for each block
      }
    }
    // UV rotation
    const r = eFace.rotation || 0
    const uvcs = Math.cos(r * Math.PI / 180)
    const uvsn = -Math.sin(r * Math.PI / 180)

    const aos = []
    for (const pos of corners) {
      attr.positions.push((pos[0] ? maxx : minx) + cursor.x, (pos[1] ? maxy : miny) + cursor.y, (pos[2] ? maxz : minz) + cursor.z)
      attr.normals.push(dir.x, dir.y, dir.z)

      const baseu = (pos[3] - 0.5) * uvcs - (pos[4] - 0.5) * uvsn + 0.5
      const basev = (pos[3] - 0.5) * uvsn + (pos[4] - 0.5) * uvcs + 0.5
      attr.uvs.push(baseu * su + u, basev * sv + v)

      let light = 1
      if (doAO) {
        const dx = pos[0] * 2 - 1
        const dy = pos[1] * 2 - 1
        const dz = pos[2] * 2 - 1
        const side1 = world.getBlock(cursor.offset(dx * mask1[0], dy * mask1[1], dz * mask1[2]))
        const side2 = world.getBlock(cursor.offset(dx * mask2[0], dy * mask2[1], dz * mask2[2]))
        const corner = world.getBlock(cursor.offset(dx, dy, dz))

        const side1Block = (side1 && isCube(side1.shapes)) ? 1 : 0
        const side2Block = (side2 && isCube(side2.shapes)) ? 1 : 0
        const cornerBlock = (corner && isCube(corner.shapes)) ? 1 : 0

        // TODO: correctly interpolate ao light based on pos (evaluate once for each corner of the block)

        const ao = (side1Block && side2Block) ? 0 : (3 - (side1Block + side2Block + cornerBlock))
        light = ao / 3
        aos.push(ao)
      }

      attr.colors.push(tint[0] * light, tint[1] * light, tint[2] * light)
    }

    if (doAO && aos[0] + aos[3] >= aos[1] + aos[2]) {
      attr.indices.push(
        ndx, ndx + 3, ndx + 2,
        ndx, ndx + 1, ndx + 3
      )
    } else {
      attr.indices.push(
        ndx, ndx + 1, ndx + 2,
        ndx + 2, ndx + 1, ndx + 3
      )
    }
  }
}

function getSectionGeometry (sx, sy, sz, world) {
  const attr = {
    positions: [],
    normals: [],
    colors: [],
    uvs: [],
    indices: []
  }

  const cursor = new Vec3(0, 0, 0)
  for (cursor.y = sy; cursor.y < sy + 16; cursor.y++) {
    for (cursor.z = sz; cursor.z < sz + 16; cursor.z++) {
      for (cursor.x = sx; cursor.x < sx + 16; cursor.x++) {
        const block = world.getBlock(cursor)
        const variant = getModelVariant(block, world.blocksStates)
        if (!variant || !variant.model) continue

        for (const element of variant.model.elements) {
          renderElement(world, cursor, element, variant.model.ao, attr)
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(attr.positions), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(attr.normals), 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(attr.colors), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(attr.uvs), 2))
  geometry.setIndex(attr.indices)
  return geometry
}

function parseProperties (properties) {
  const json = {}
  for (const prop of properties.split(',')) {
    const [key, value] = prop.split('=')
    json[key] = value
  }
  return json
}

function matchProperties (block, properties) {
  properties = parseProperties(properties)
  const blockProps = block.getProperties()
  for (const prop in blockProps) {
    if (properties[prop] !== undefined && (blockProps[prop] + '') !== properties[prop]) {
      return false
    }
  }
  return true
}

function getModelVariant (block, blockStates) {
  const state = blockStates[block.name]
  if (!state) return null
  if (state.variants) {
    for (const [properties, variant] of Object.entries(state.variants)) {
      if (!matchProperties(block, properties)) continue
      if (variant instanceof Array) return variant[0] // TODO: random
      return variant
    }
  }
  if (state.multipart) {
    for (const variant of state.multipart) { // TODO: match properties
      if (variant.apply instanceof Array) return variant.apply[0] // TODO: random
      return variant.apply
    }
  }
  return null
}

module.exports = { getSectionGeometry }
