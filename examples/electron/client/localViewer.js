const { WorldView } = require('../../../lib/WorldView')
const { Viewer } = require('../../../src/viewer')
const { Vec3 } = require('vec3')
global.THREE = require('three')
require('three/examples/js/controls/OrbitControls')

class LocalViewer {
  constructor(version, savePath, viewDistance = 4) {
    this.viewDistance = viewDistance
    this.center = new Vec3(0, 0, 0)
    this.savePath = savePath

    this.World = require('prismarine-world')(version)
    this.Chunk = require('prismarine-chunk')(version)
    this.Anvil = require('prismarine-provider-anvil').Anvil(version)
  }

  start() {
    this.world = new this.World(null, new this.Anvil(this.savePath), 0 /* no saving */)
    this.worldView = new WorldView(this.world, this.viewDistance, this.center)

    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    this.viewer = new Viewer(this.renderer)

    this.controls = new THREE.OrbitControls(this.viewer.camera, this.renderer.domElement)

    let animate = () => {
      window.requestAnimationFrame(animate)
      if (this.controls) this.controls.update()
      this.renderer.render(this.viewer.scene, this.viewer.camera)
    }
    animate()
  }
}

module.exports = LocalViewer