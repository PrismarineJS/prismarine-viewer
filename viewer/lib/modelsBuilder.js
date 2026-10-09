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

  for (const axis in ['x', 'y', 'z']) {
    if (axis in data) {
      model[axis] = data[axis]
    }
  }

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

function unwrapTexture (ref) {
  // 26.x wraps some model texture refs in objects ({ sprite, force_translucent, ... })
  return typeof ref === 'object' && ref !== null ? ref.sprite : ref
}

function prepareModel (model, texturesJson) {
  // resolve texture names eg west: #all -> blocks/stone
  for (const tex in model.textures) {
    let root = unwrapTexture(model.textures[tex])
    while (root.charAt(0) === '#') {
      root = unwrapTexture(model.textures[root.substr(1)])
    }
    model.textures[tex] = root
  }
  for (const tex in model.textures) {
    let name = model.textures[tex]
    name = cleanupBlockName(name)
    model.textures[tex] = texturesJson[name]
  }
  for (const elem of model.elements) {
    for (const sideName of Object.keys(elem.faces)) {
      const face = elem.faces[sideName]

      if (face.texture.charAt(0) === '#') {
        face.texture = JSON.parse(JSON.stringify(model.textures[face.texture.substr(1)]))
      } else if (
        !(cleanupBlockName(face.texture) in texturesJson) &&
        face.texture in model.textures
      ) {
        face.texture = JSON.parse(JSON.stringify(model.textures[face.texture]))
      } else {
        let name = face.texture
        name = cleanupBlockName(name)
        face.texture = JSON.parse(JSON.stringify(texturesJson[name]))
      }

      let uv = face.uv
      if (!uv) {
        const _from = elem.from
        const _to = elem.to

        // taken from https://github.com/DragonDev1906/Minecraft-Overviewer/
        uv = {
          north: [_to[0], 16 - _to[1], _from[0], 16 - _from[1]],
          east: [_from[2], 16 - _to[1], _to[2], 16 - _from[1]],
          south: [_from[0], 16 - _to[1], _to[0], 16 - _from[1]],
          west: [_from[2], 16 - _to[1], _to[2], 16 - _from[1]],
          up: [_from[0], _from[2], _to[0], _to[2]],
          down: [_to[0], _from[2], _from[0], _to[2]]
        }[sideName]
      }

      const su = (uv[2] - uv[0]) * face.texture.su / 16
      const sv = (uv[3] - uv[1]) * face.texture.sv / 16
      face.texture.bu = face.texture.u + 0.5 * face.texture.su
      face.texture.bv = face.texture.v + 0.5 * face.texture.sv
      face.texture.u += uv[0] * face.texture.su / 16
      face.texture.v += uv[1] * face.texture.sv / 16
      face.texture.su = su
      face.texture.sv = sv
    }
  }
}

function resolveModel (name, blocksModels, texturesJson) {
  const model = getModel(name, blocksModels)
  prepareModel(model, texturesJson.textures)
  return model
}

function cuboid (from, to, texture, textureOffset, textureScale, hiddenFaces = []) {
  const [u, v] = textureOffset
  const width = to[0] - from[0]
  const height = to[1] - from[1]
  const depth = to[2] - from[2]
  const uv = {
    down: [u + depth, v, u + depth + width, v + depth],
    up: [u + depth + width, v + depth, u + depth + width * 2, v],
    west: [u, v + depth, u + depth, v + depth + height],
    north: [u + depth, v + depth, u + depth + width, v + depth + height],
    east: [u + depth + width, v + depth, u + depth + width + depth, v + depth + height],
    south: [u + depth + width + depth, v + depth, u + depth + width + depth + width, v + depth + height]
  }
  const faces = {}
  for (const face of ['down', 'up', 'north', 'south', 'west', 'east']) {
    if (!hiddenFaces.includes(face)) {
      const faceUv = face === 'up' ? uv[face] : [uv[face][2], uv[face][3], uv[face][0], uv[face][1]]
      faces[face] = { texture, uv: faceUv.map(value => value * textureScale) }
    }
  }
  return { from, to, faces }
}

function buildChestModel (textureName, part = 'single', textureWidth = 64) {
  const isLeft = part === 'left'
  const isRight = part === 'right'
  const hiddenFaces = isLeft ? ['west'] : isRight ? ['east'] : []
  const bodyFrom = isLeft ? [0, 0, 1] : [1, 0, 1]
  const bodyTo = isRight ? [16, 10, 15] : [15, 10, 15]
  const lidFrom = isLeft ? [0, 9, 1] : [1, 9, 1]
  const lidTo = isRight ? [16, 14, 15] : [15, 14, 15]
  const lockFrom = isLeft ? [0, 7, 15] : isRight ? [15, 7, 15] : [7, 7, 15]
  const lockTo = isLeft ? [1, 11, 16] : isRight ? [16, 11, 16] : [9, 11, 16]
  const textureScale = 16 / textureWidth

  return {
    textures: { chest: textureName },
    elements: [
      cuboid(bodyFrom, bodyTo, '#chest', [0, 19], textureScale, hiddenFaces),
      cuboid(lidFrom, lidTo, '#chest', [0, 0], textureScale, hiddenFaces),
      cuboid(lockFrom, lockTo, '#chest', [0, 0], textureScale, hiddenFaces)
    ],
    ao: true
  }
}

function chestTexture (atlas, family, suffix) {
  const base = `entity/chest/${family}`
  const variant = suffix ? `${base}_${suffix}` : base
  if (atlas.json.textures[variant]) return variant
  const legacyDouble = `${base}_double`
  if (suffix && atlas.json.textures[legacyDouble]) return legacyDouble
  return base
}

function prepareChestModels (blocksStates, atlas) {
  const chestModels = {}
  for (const family of ['normal', 'trapped', 'ender']) {
    const models = {}
    for (const part of ['single', 'left', 'right']) {
      const suffix = part === 'single' ? '' : part
      const textureName = chestTexture(atlas, family, suffix)
      const texture = atlas.json.textures[textureName]
      const model = buildChestModel(textureName, part, texture.width || 64)
      prepareModel(model, atlas.json.textures)
      models[part] = model
    }
    chestModels[family === 'normal' ? 'chest' : `${family}_chest`] = models
  }
  blocksStates.__chestModels = chestModels
}

function prepareBlocksStates (mcAssets, atlas) {
  const blocksStates = mcAssets.blocksStates
  mcAssets.blocksStates.missing_texture = {
    variants: {
      normal: {
        model: 'missing_texture'
      }
    }
  }
  mcAssets.blocksModels.missing_texture = {
    parent: 'block/cube_all',
    textures: {
      all: 'blocks/missing_texture'
    }
  }
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
  prepareChestModels(blocksStates, atlas)
  return blocksStates
}

module.exports = { buildChestModel, prepareBlocksStates }
