const path = require('path')
const { makeTextureAtlas } = require('./lib/atlas')
const { prepareBlocksStates } = require('./lib/modelsBuilder')
const mcAssets = require('minecraft-assets')
const Chunks = require('prismarine-chunk')
const fs = require('fs-extra')

const supportedVersions = require('./lib/version').supportedVersions

// World bounds come from prismarine-chunk, which is a build-time dependency here.
// Emitting them lets the browser fetch the answer instead of bundling
// prismarine-chunk (and all of minecraft-data behind it) into index.js.
const publicPath = path.resolve(__dirname, '../public')
fs.mkdirSync(publicPath, { recursive: true })
fs.writeFileSync(path.resolve(publicPath, 'worldBounds.json'), JSON.stringify(
  Object.fromEntries(supportedVersions.map(version => {
    const chunk = new (Chunks(version))()
    return [version, { minY: chunk.minY ?? 0, worldHeight: chunk.worldHeight ?? 256 }]
  }))
))

const texturesPath = path.resolve(__dirname, '../public/textures')
if (fs.existsSync(texturesPath) && !process.argv.includes('-f')) {
  console.log('textures folder already exists, skipping...')
  process.exit(0)
}
fs.mkdirSync(texturesPath, { recursive: true })

const blockStatesPath = path.resolve(__dirname, '../public/blocksStates')
fs.mkdirSync(blockStatesPath, { recursive: true })

for (const version of supportedVersions) {
  const assets = mcAssets(version)
  const atlas = makeTextureAtlas(assets)
  const out = fs.createWriteStream(path.resolve(texturesPath, version + '.png'))
  const stream = atlas.canvas.pngStream()
  stream.on('data', (chunk) => out.write(chunk))
  stream.on('end', () => console.log('Generated textures/' + version + '.png'))

  const blocksStates = JSON.stringify(prepareBlocksStates(assets, atlas))
  fs.writeFileSync(path.resolve(blockStatesPath, version + '.json'), blocksStates)

  fs.copySync(assets.directory, path.resolve(texturesPath, version), { overwrite: true })
}
