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

function cuboid (from, to, texture, uv) {
  const faces = {}
  for (const face of ['down', 'up', 'north', 'south', 'west', 'east']) {
    faces[face] = { texture, uv: uv[face] || uv.default }
  }
  return { from, to, faces }
}

function buildChestModel (textureName) {
  const body = {
    north: [3.5, 4.75, 10.5, 8],
    south: [3.5, 4.75, 10.5, 8],
    west: [0, 4.75, 3.5, 8],
    east: [0, 4.75, 3.5, 8],
    up: [0, 8.25, 14, 10.75],
    down: [0, 8.25, 14, 10.75]
  }
  const lid = {
    north: [3.5, 0, 10.5, 3.5],
    south: [3.5, 0, 10.5, 3.5],
    west: [0, 0, 3.5, 3.5],
    east: [0, 0, 3.5, 3.5],
    up: [0, 3.5, 14, 4.5],
    down: [0, 3.5, 14, 4.5]
  }

  return {
    textures: { chest: textureName },
    elements: [
      cuboid([0, 0, 0], [16, 10, 14], '#chest', body),
      cuboid([0, 10, 0], [16, 14, 14], '#chest', lid),
      cuboid([7, 10, 14], [9, 13, 15], '#chest', { default: [8.25, 5.25, 10.5, 7.5] })
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
      const model = buildChestModel(chestTexture(atlas, family, suffix))
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
