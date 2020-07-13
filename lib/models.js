function getModel (name, blocksModels) {
  if (name.startsWith('block')) name = name.split('/')[1]
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
    if (name.startsWith('block')) name = name.split('/')[1]
    model.textures[tex] = texturesJson[name]
  }
  for (const elem of model.elements) {
    for (const face of Object.values(elem.faces)) {
      if (face.texture.charAt(0) === '#') {
        face.texture = JSON.parse(JSON.stringify(model.textures[face.texture.substr(1)]))
      } else {
        let name = face.texture
        if (name.startsWith('block')) name = name.split('/')[1]
        face.texture = JSON.parse(JSON.stringify(texturesJson[name]))
      }
      if (face.uv) {
        const su = (face.uv[2] - face.uv[0]) * face.texture.su / 16
        const sv = (face.uv[3] - face.uv[1]) * face.texture.sv / 16
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

module.exports = { resolveModel }
