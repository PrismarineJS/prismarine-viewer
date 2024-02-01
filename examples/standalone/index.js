/* global THREE, fetch */
const { WorldView, Viewer, MapControls } = require('prismarine-viewer/viewer')
const { Vec3 } = require('vec3')
const { Schematic } = require('prismarine-schematic')
global.THREE = require('three')

async function main () {
  const version = '1.16.4'
  const data = await fetch('smallhouse1.schem').then(r => r.arrayBuffer())
  const schem = await Schematic.read(Buffer.from(data), version)

  const viewDistance = 10
  const center = new Vec3(0, 90, 0)

  const World = require('prismarine-world')(version)

  const diamondSquare = require('diamond-square')({ version, seed: Math.floor(Math.random() * Math.pow(2, 31)) })
  const world = new World(diamondSquare)

  await schem.paste(world, new Vec3(0, 60, 0))

  const worldView = new WorldView(world, viewDistance, center)

  // Create three.js context, add to page
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // Create viewer
  const viewer = new Viewer(renderer)
  if (!viewer.setVersion(version)) {
    return false
  }
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
    viewer.update()
    renderer.render(viewer.scene, viewer.camera)
  }
  animate()
}
main()
