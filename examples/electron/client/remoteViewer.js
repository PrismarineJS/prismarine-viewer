// const { WorldView } = require('../../../lib/WorldView')
// const { Viewer } = require('../../../src/viewer')
// const io = require('socket.io-client')

class RemoteViewer {
  constructor(host, viewDistance = 4) {
    this.host = host
    this.viewDistance = viewDistance
    this.start()
  }

  start() {
    this.socket = io(this.host)

    this.world = new this.World(null, new this.Anvil(this.savePath), 0 /* no saving */)
    this.worldView = new WorldView(world, this.viewDistance, this.center)

    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    this.viewer = new Viewer(renderer)

    this.controls = new THREE.OrbitControls(viewer.camera, renderer.domElement)

    function animate() {
      window.requestAnimationFrame(animate)
      if (this.controls) this.controls.update()
      this.renderer.render(viewer.scene, viewer.camera)
    }
    animate()
  }
}

module.exports = RemoteViewer