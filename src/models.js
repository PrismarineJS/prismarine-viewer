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

function renderLiquid (world, cursor, texture, type, water, attr) {
  for (const face in elemFaces) {
    const { dir, corners } = elemFaces[face]

    const neighbor = world.getBlock(cursor.plus(dir))
    if (!neighbor || neighbor.type === type || neighbor.isCube || (neighbor.transparent && neighbor.type !== 0) ||
        neighbor.position.y < 0) continue

    let tint = [1, 1, 1]
    if (water) {
      tint = [0.247, 0.463, 0.894] // TODO: correct tint for the biome
    }

    const u = texture.u
    const v = texture.v
    const su = texture.su
    const sv = texture.sv

    const ndx = Math.floor(attr.positions.length / 3)

    for (const pos of corners) {
      attr.positions.push(
        (pos[0] ? 1 : 0) + (cursor.x & 15) - 8,
        (pos[1] ? 1 : 0) + (cursor.y & 15) - 8,
        (pos[2] ? 1 : 0) + (cursor.z & 15) - 8)
      attr.normals.push(dir.x, dir.y, dir.z)

      attr.uvs.push(pos[3] * su + u, pos[4] * sv + v)

      attr.colors.push(tint[0], tint[1], tint[2])
    }

    attr.indices.push(
      ndx, ndx + 1, ndx + 2,
      ndx + 2, ndx + 1, ndx + 3
    )
  }
}

function renderElement (world, cursor, element, doAO, attr) {
  for (const face in element.faces) {
    const eFace = element.faces[face]
    const { dir, corners, mask1, mask2 } = elemFaces[face]

    if (eFace.cullface) {
      const neighbor = world.getBlock(cursor.plus(dir))
      if (!neighbor || !(neighbor.transparent || !neighbor.isCube) || neighbor.position.y < 0) continue
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
      attr.positions.push(
        (pos[0] ? maxx : minx) + (cursor.x & 15) - 8,
        (pos[1] ? maxy : miny) + (cursor.y & 15) - 8,
        (pos[2] ? maxz : minz) + (cursor.z & 15) - 8)
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

        const side1Block = (side1 && side1.isCube) ? 1 : 0
        const side2Block = (side2 && side2.isCube) ? 1 : 0
        const cornerBlock = (corner && corner.isCube) ? 1 : 0

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

function getSectionGeometry (sx, sy, sz, world, blocksStates) {
  const attr = {
    sx: sx + 8,
    sy: sy + 8,
    sz: sz + 8,
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
        if (block.variant === undefined) {
          block.variant = getModelVariant(block, blocksStates)
        }
        const variant = block.variant
        if (!variant || !variant.model) continue

        if (block.name === 'water') {
          renderLiquid(world, cursor, variant.model.textures.particle, block.type, true, attr)
        } else if (block.name === 'lava') {
          renderLiquid(world, cursor, variant.model.textures.particle, block.type, false, attr)
        } else {
          for (const element of variant.model.elements) {
            renderElement(world, cursor, element, variant.model.ao, attr)
          }
        }
      }
    }
  }

  attr.positions = new Float32Array(attr.positions)
  attr.normals = new Float32Array(attr.normals)
  attr.colors = new Float32Array(attr.colors)
  attr.uvs = new Float32Array(attr.uvs)

  return attr
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
