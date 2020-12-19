/* global THREE */
const { WorldView } = require('prismarine-viewer/lib/worldView')
const { Viewer } = require('prismarine-viewer/src/viewer')
const { Vec3 } = require('vec3')
global.THREE = require('three')
require('three/examples/js/controls/OrbitControls')

class LocalViewer {
  constructor (version, savePath, viewDistance = 4) {
    this.version = version
    this.viewDistance = viewDistance
    this.center = new Vec3(0, 90, 0)
    this.savePath = savePath

    this.World = require('prismarine-world')(version)
    this.Chunk = require('prismarine-chunk')(version)
    this.Anvil = require('prismarine-provider-anvil').Anvil(version)
  }

  start () {
    // Create viewer data provider
    this.world = new this.World(null, new this.Anvil(this.savePath), 0 /* no saving */)
    this.worldView = new WorldView(this.world, this.viewDistance, this.center)

    // Create three.js context, add to page
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    // Create viewer
    this.viewer = new Viewer(this.renderer)
    this.viewer.setVersion(this.version)
    // Attach controls to viewer
    this.controls = new THREE.OrbitControls(this.viewer.camera, this.renderer.domElement)

    // Link WorldView and Viewer
    this.viewer.listen(this.worldView)
    // Initialize viewer, load chunks
    this.worldView.init(this.center)

    this.viewer.camera.position.set(this.center.x, this.center.y, this.center.z)
    this.controls.update()

    // Browser animation loop
    const animate = () => {
      window.requestAnimationFrame(animate)
      if (this.controls) this.controls.update()
      this.worldView.updatePosition(this.controls.target)
      this.renderer.render(this.viewer.scene, this.viewer.camera)
    }
    animate()
  }
}

module.exports = LocalViewer