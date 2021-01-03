/* global THREE */

/*
This is an example of using only the core API (.viewer) to implement rendering a world and saving a screenshot of it
*/

global.THREE = require('three')
global.Worker = require('worker_threads').Worker
const { createCanvas, ImageData } = require('node-canvas-webgl/lib')
const { Schematic } = require('prismarine-schematic')
const fs = require('fs').promises
const Vec3 = require('vec3').Vec3

const { Viewer, WorldView } = require('../..').viewer

const main = async () => {
  const viewDistance = 4
  const width = 512
  const height = 512
  const version = '1.16.4'
  const World = require('prismarine-world')(version)
  const Chunk = require('prismarine-chunk')(version)
  const center = new Vec3(30, 90, 30)
  const canvas = createCanvas(width, height)
  const renderer = new THREE.WebGLRenderer({ canvas })
  const viewer = new Viewer(renderer, false)
  const data = await fs.readFile('../standalone/public/smallhouse1.schem')
  const schem = await Schematic.read(data, version)

  const world = new World(() => new Chunk())

  await schem.paste(world, new Vec3(0, 60, 0))

  viewer.setVersion(version)

  // Load world
  const worldView = new WorldView(world, viewDistance, center)
  viewer.listen(worldView)

  viewer.camera.position.set(center.x, center.y, center.z)

  const point = new THREE.Vector3(0, 60, 0)

  viewer.camera.lookAt(point)

  await worldView.init(center)
  await new Promise(resolve => setTimeout(resolve, 3000))
  renderer.render(viewer.scene, viewer.camera)

  require('three/examples/js/exporters/OBJExporter')
  await fs.writeFile('model.obj', new THREE.OBJExporter().parse(viewer.scene))

  const STLExporter = require('three-stlexporter')
  await fs.writeFile('model.stl', Buffer.from(new STLExporter().parse(viewer.scene)))

  const { Blob, FileReader } = require('vblob')

  // Patch global scope to imitate browser environment.
  global.window = global
  global.Blob = Blob
  global.FileReader = FileReader
  global.THREE = THREE
  global.ImageData = ImageData
  global.document = {
    createElement: (nodeName) => {
      if (nodeName !== 'canvas') throw new Error(`Cannot create node ${nodeName}`)
      const canvas = createCanvas(256, 256)
      return canvas
    }
  }

  require('three-gltf-exporter')
  await fs.writeFile('model.gltf', await new Promise(resolve => new THREE.GLTFExporter().parse(viewer.scene, (a) => resolve(JSON.stringify(a)), {
    embedImages: true,
    binary: false
  })))
  console.log('saved')
  process.exit(0)
}
main()
