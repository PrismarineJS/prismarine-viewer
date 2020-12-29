/* global THREE XMLHttpRequest */
const { WorldView, Viewer, MapControls } = require('prismarine-viewer/viewer')
const { Vec3 } = require('vec3')
global.THREE = require('three')

const { Schematic } = require('prismarine-schematic')

function getSchematic (url, cb) {
  const oReq = new XMLHttpRequest()
  oReq.open('GET', url, true)
  oReq.responseType = 'arraybuffer'
  oReq.onload = () => {
    cb(oReq.response)
  }
  oReq.send(null)
}

// load and paste a schematic
getSchematic('smallhouse1.schem', async (data) => {
  const schem = await Schematic.read(Buffer.from(data), '1.16.4')

  const version = schem.version
  const viewDistance = 6
  const center = new Vec3(0, 90, 0)

  const World = require('prismarine-world')(version)
  const Chunk = require('prismarine-chunk')(version)

  const chunkGenerator = (chunkX, chunkZ) => {
    const chunk = new Chunk()
    const p = new Vec3(0, 0, 0)
    for (p.y = 59; p.y < 60; p.y++) {
      for (p.x = 0; p.x < 16; p.x++) {
        for (p.z = 0; p.z < 16; p.z++) {
          chunk.setBlockStateId(p, 1)
        }
      }
    }
    return chunk
  }

  const world = new World(chunkGenerator)
  const worldView = new WorldView(world, viewDistance, center)

  await schem.paste(world, new Vec3(0, 60, 0))

  // Create three.js context, add to page
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Create viewer
  const viewer = new Viewer(renderer)
  viewer.setVersion(version)
  // Attach controls to viewer
  const controls = new MapControls(viewer.camera, renderer.domElement)

  // Link WorldView and Viewer
  viewer.listen(worldView)
  // Initialize viewer, load chunks
  worldView.init(center)

  viewer.camera.position.set(center.x, center.y, center.z)
  controls.update()

  // Browser animation loop
  const animate = () => {
    window.requestAnimationFrame(animate)
    if (controls) controls.update()
    worldView.updatePosition(controls.target)
    renderer.render(viewer.scene, viewer.camera)
  }
  animate()
})
