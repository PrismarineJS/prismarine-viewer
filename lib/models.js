function cleanupBlockName (name) {
  if (name.startsWith('block') || name.startsWith('minecraft:block')) return name.split('/')[1]
  return name
}

function getModel (name, blocksModels) {
  name = cleanupBlockName(name)
  const data = blocksModels[name]
  if (!data) {
    return null
  }
  let model = { textures: {}, elements: [], ao: true }
  if (data.parent) {
    model = getModel(data.parent, blocksModels)
  }
  if (data.textures) {
    Object.assign(model.textures, JSON.parse(JSON.stringify(data.textures)))
  }
  if (data.elements) {
    model.elements = JSON.parse(JSON.stringify(data.elements))
  }
  if (data.ambientocclusion !== undefined) {
    model.ao = data.ambientocclusion
  }
  return model
}

function prepareModel (model, texturesJson) {
  for (const tex in model.textures) {
    let root = model.textures[tex]
    while (root.charAt(0) === '#') {
      root = model.textures[root.substr(1)]
    }
    model.textures[tex] = root
  }
  for (const tex in model.textures) {
    let name = model.textures[tex]
    name = cleanupBlockName(name)
    model.textures[tex] = texturesJson[name]
  }
  for (const elem of model.elements) {
    for (const face of Object.values(elem.faces)) {
      if (face.texture.charAt(0) === '#') {
        face.texture = JSON.parse(JSON.stringify(model.textures[face.texture.substr(1)]))
      } else {
        let name = face.texture
        name = cleanupBlockName(name)
        face.texture = JSON.parse(JSON.stringify(texturesJson[name]))
      }
      if (face.uv) {
        const su = (face.uv[2] - face.uv[0]) * face.texture.su / 16
        const sv = (face.uv[3] - face.uv[1]) * face.texture.sv / 16
        face.texture.bu = face.texture.u + 0.5 * face.texture.su
        face.texture.bv = face.texture.v + 0.5 * face.texture.sv
        face.texture.u += face.uv[0] * face.texture.su / 16
        face.texture.v += face.uv[1] * face.texture.sv / 16
        face.texture.su = su
        face.texture.sv = sv
      }
    }
  }
}

function resolveModel (name, blocksModels, texturesJson) {
  const model = getModel(name, blocksModels)
  prepareModel(model, texturesJson.textures)
  return model
}

function rotateUV (angle, x, y) {
  const cs = Math.cos(angle)
  const sn = Math.sin(angle)
  const nx = x * cs - y * sn
  y = x * sn + y * cs
  x = nx
  return [x, y]
}

function rotatePoint (axis, angle, point) {
  let x = point[0] - 8
  let y = point[1] - 8
  let z = point[2] - 8

  if (axis === 'y') {
    const cs = Math.cos(angle)
    const sn = Math.sin(angle)
    const nx = x * cs - z * sn
    z = x * sn + z * cs
    x = nx
  }

  if (axis === 'x') {
    const cs = Math.cos(angle)
    const sn = Math.sin(angle)
    const ny = y * cs - z * sn
    z = y * sn + z * cs
    y = ny
  }

  return [x + 8, y + 8, z + 8]
}

const facingRotTable = {
  x_90: { up: 'north', down: 'south', east: 'east', west: 'west', north: 'down', south: 'up' },
  x_180: { up: 'down', down: 'up', east: 'east', west: 'west', north: 'south', south: 'north' },
  x_270: { up: 'south', down: 'north', east: 'east', west: 'west', north: 'up', south: 'down' },
  y_90: { up: 'up', down: 'down', east: 'south', west: 'north', north: 'east', south: 'west' },
  y_180: { up: 'up', down: 'down', east: 'west', west: 'east', north: 'south', south: 'north' },
  y_270: { up: 'up', down: 'down', east: 'north', west: 'south', north: 'west', south: 'east' }
}

const isFaceRotatedTable = {
  x: { up: false, down: false, east: true, west: true, north: false, south: false },
  y: { up: true, down: true, east: false, west: false, north: false, south: false }
}

function rotateFacing (axis, angle, face) {
  if (angle === 0) return face
  return facingRotTable[axis + '_' + angle][face]
}

function rotateModel (axis, angle, model, uvlock) {
  for (const elem of model.elements) {
    const a = rotatePoint(axis, angle * Math.PI / 180, elem.to)
    const b = rotatePoint(axis, angle * Math.PI / 180, elem.from)
    elem.to = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]
    elem.from = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])]

    const faces = {}
    for (const face in elem.faces) {
      const f = elem.faces[face]
      if (f.cullface) {
        f.cullface = rotateFacing(axis, angle, f.cullface)
      }
      if (isFaceRotatedTable[axis][face]) {
        if (uvlock) {
          const a = rotateUV(angle * Math.PI / 180, f.texture.u - f.texture.bu, f.texture.v - f.texture.bv)
          const b = rotateUV(angle * Math.PI / 180, f.texture.u - f.texture.bu + f.texture.su, f.texture.v - f.texture.bv + f.texture.sv)
          f.texture.u = Math.min(a[0], b[0]) + f.texture.bu
          f.texture.v = Math.min(a[1], b[1]) + f.texture.bv
          f.texture.su = Math.abs(a[0] - b[0])
          f.texture.sv = Math.abs(a[1] - b[1])
        } else {
          if (f.rotation === undefined) f.rotation = 0
          f.rotation += angle
          if (f.rotation > 360) f.rotation -= 360
        }
      }
      faces[rotateFacing(axis, angle, face)] = f
    }
    elem.faces = faces
  }
}

function prepareBlocksStates (mcAssets, atlas) {
  const blocksStates = mcAssets.blocksStates
  for (const block of Object.values(blocksStates)) {
    if (!block) continue
    if (block.variants) {
      for (const variant of Object.values(block.variants)) {
        if (variant instanceof Array) {
          for (const v of variant) {
            v.model = resolveModel(v.model, mcAssets.blocksModels, atlas.json)
          }
        } else {
          variant.model = resolveModel(variant.model, mcAssets.blocksModels, atlas.json)
        }
        if (variant.x) {
          rotateModel('x', variant.x, variant.model, variant.uvlock)
        }
        if (variant.y) {
          rotateModel('y', variant.y, variant.model, variant.uvlock)
        }
      }
    }
    if (block.multipart) {
      for (const variant of block.multipart) {
        if (variant.apply instanceof Array) {
          for (const v of variant.apply) {
            v.model = resolveModel(v.model, mcAssets.blocksModels, atlas.json)
          }
        } else {
          variant.apply.model = resolveModel(variant.apply.model, mcAssets.blocksModels, atlas.json)
        }
      }
    }
  }
  return blocksStates
}

module.exports = { prepareBlocksStates }
