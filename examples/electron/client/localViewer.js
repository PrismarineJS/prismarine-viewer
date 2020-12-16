const { WorldView } = require('../../../lib/WorldView')
const { Viewer } = require('../../../src/viewer')
const { Vec3 } = require('vec3')
global.THREE = require('three')
require('three/examples/js/controls/OrbitControls')

class LocalViewer {
  constructor(version, savePath, viewDistance = 4) {
    this.version = version
    this.viewDistance = viewDistance
    this.center = new Vec3(0, 0, 0)
    this.savePath = savePath

    this.World = require('prismarine-world')(version)
    this.Chunk = require('prismarine-chunk')(version)
    this.Anvil = require('prismarine-provider-anvil').Anvil(version)
    this.timer = null
  }

  start() {
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

    // Browser animation loop
    const animate = () => {
      window.requestAnimationFrame(animate)
      if (this.controls) this.controls.update()
      this.renderer.render(this.viewer.scene, this.viewer.camera)
    }
    animate()

    // Sends camera movements to worldView
    this.startTicking()
  }

  tick = () => {
    this.worldView.updatePosition(this.viewer.camera.position)
  }

  startTicking() {
    clearInterval(this.timer)
    this.timer = setInterval(this.tick, 1000)
  }
}

module.exports = LocalViewer