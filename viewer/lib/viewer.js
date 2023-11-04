
const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')
const { WorldRenderer } = require('./worldrenderer')
const { Entities } = require('./entities')
const { Primitives } = require('./primitives')
const { getVersion } = require('./version')
const { Vec3 } = require('vec3')

class Viewer {
  constructor (renderer) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('lightblue')

    this.ambientLight = new THREE.AmbientLight(0xcccccc)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    this.directionalLight.position.set(1, 1, 0.5).normalize()
    this.directionalLight.castShadow = true
    this.scene.add(this.directionalLight)

    const size = renderer.getSize(new THREE.Vector2())
    this.camera = new THREE.PerspectiveCamera(75, size.x / size.y, 0.1, 1000)

    this.world = new WorldRenderer(this.scene)
    this.entities = new Entities(this.scene)
    this.primitives = new Primitives(this.scene, this.camera)

    this.domElement = renderer.domElement
  }

  setVersion (version) {
    version = getVersion(version)
    console.log('Using version: ' + version)
    this.version = version
    this.world.setVersion(version)
    this.entities.clear()
    this.primitives.clear()
  }

  addColumn (x, z, chunk) {
    this.world.addColumn(x, z, chunk)
  }

  removeColumn (x, z) {
    this.world.removeColumn(x, z)
  }

  setBlockStateId (pos, stateId) {
    this.world.setBlockStateId(pos, stateId)
  }

  updateEntity (e) {
    this.entities.update(e)
  }

  updatePrimitive (p) {
    this.primitives.update(p)
  }

  setFirstPersonCamera (pos, yaw, pitch) {
    if (pos) new TWEEN.Tween(this.camera.position).to({ x: pos.x, y: pos.y + 1.6, z: pos.z }, 50).start()
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  }

  listen (emitter) {
    emitter.on('entity', (e) => {
      this.updateEntity(e)
    })

    emitter.on('primitive', (p) => {
      this.updatePrimitive(p)
    })

    emitter.on('loadChunk', ({ x, z, chunk }) => {
      this.addColumn(x, z, chunk)
    })

    emitter.on('unloadChunk', ({ x, z }) => {
      this.removeColumn(x, z)
    })

    emitter.on('blockUpdate', ({ pos, stateId }) => {
      this.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
    })

    emitter.on('timecycleUpdate', ({ timeOfDay, moonPhase }) => {
      this.updateTimecycleLighting(timeOfDay, moonPhase)
    })

    this.domElement.addEventListener('pointerdown', (evt) => {
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      mouse.x = (evt.clientX / this.domElement.clientWidth) * 2 - 1
      mouse.y = -(evt.clientY / this.domElement.clientHeight) * 2 + 1
      raycaster.setFromCamera(mouse, this.camera)
      const ray = raycaster.ray
      emitter.emit('mouseClick', { origin: ray.origin, direction: ray.direction, button: evt.button })
    })
  }

  updateTimecycleLighting(timeOfDay, moonPhase) {
    if (timeOfDay === undefined) { return }
    const lightIntensity = this.calculateIntensity(timeOfDay)
    const skyColor = scene.background.getHexString()
    const newSkyColor = `#${this.darkenSkyColour(skyColor, lightIntensity).padStart(6, 0)}`

    function timeToRads(time) {
      return time * (Math.PI / 12000)
    }

    // Update colours
    this.scene.background = new THREE.Color(newSkyColor)
    this.ambientLight.itensity = ((lightIntensity < 0.25) ? 0.25 : lightIntensity) + (0.07 - (moonPhase / 100))
    this.directionalLight.intensity = lightIntensity + (0.07 - (moonPhase / 100))
    this.directionalLight.position.set(
      Math.cos(timeToRads(timeOfDay)),
      Math.sin(timeToRads(timeOfDay)),
      0.2
    ).normalize()
  }

  calculateIntensity(timeOfDay) {
    if ((timeOfDay >= 13000) && (timeOfDay <= 23000)) {
      return 0
    } else if ((timeOfDay <= 12000) && (timeOfDay >= 0)) {
      return 0.75
    } else if ((timeOfDay < 13000) && (timeOfDay > 12000)) {
      const transition = timeOfDay - 12000
      return (0.75 - (0.75 * transition / 1000))
    } else {
      const transition = timeOfDay - 23000
      return (0.75 * transition / 1000)
    }
  }

  // Darken by factor (0 to black, 0.5 half as bright, 1 unchanged)
  darkenSkyColour(skyColour, factor) {
    skyColour = parseInt(skyColour, 16)
    return (Math.round((skyColour & 0x0000FF) * factor) |
      (Math.round(((skyColour >> 8) & 0x00FF) * factor) << 8) |
      (Math.round((skyColour >> 16) * factor) << 16)).toString(16)
  }

  update () {
    TWEEN.update()
  }

  async waitForChunksToRender () {
    await this.world.waitForChunksToRender()
  }
}

module.exports = { Viewer }
