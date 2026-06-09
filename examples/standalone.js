const standaloneViewer = require('prismarine-viewer').standalone
const { Vec3 } = require('vec3')

const version = '1.13.2'

const World = require('prismarine-world')(version)
const Chunk = require('prismarine-chunk')(version)

// Create a flat world with only 1 layer of stone at y=0
function worldGenerator (x, y, z) {
  if (y > 0) return 0
  return 1
}

const world = new World((chunkX, chunkZ) => {
  const chunk = new Chunk()
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        chunk.setBlockStateId(new Vec3(x, y, z), worldGenerator(chunkX * 16 + x, y, chunkZ * 16 + z))
      }
    }
  }
  return chunk
})

const viewer = standaloneViewer({ version, world, center: new Vec3(0, 51, 0), port: 3000 })

async function menger (x, y, z, R) {
  if (R === 1) {
    await world.setBlockStateId(new Vec3(x, y, z), 1)
    return
  }
  R /= 3
  for (let _x = 0; _x < 3; _x++) {
    for (let _y = 0; _y < 3; _y++) {
      for (let _z = 0; _z < 3; _z++) {
        const d = Math.abs(_x - 1) + Math.abs(_y - 1) + Math.abs(_z - 1)
        if (d > 1) {
          await menger(x + R * _x, y + R * _y, z + R * _z, R)
        }
      }
    }
  }
}

// Generate a level 4 menger sponge fractal
(async () => {
  const level = 4
  const R = Math.pow(3, level)
  await menger(-Math.floor(R / 2), 1, -Math.floor(R / 2), R)
  viewer.update()
})()
