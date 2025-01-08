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
    this.playerHeight = 1.6
    this.isSneaking = false
  }

  resetAll () {
    this.world.resetWorld()
    this.entities.clear()
    this.primitives.clear()
  }

  setVersion (version) {
    version = getVersion(version)
    if (version === null) {
      const msg = `${version} is not supported`
      window.alert(msg)
      console.log(msg)
      return false
    }
    console.log('Using version: ' + version)
    this.version = version
    this.world.setVersion(version)
    this.entities.clear()
    this.primitives.clear()
    return true
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
    if (pos) {
      let y = pos.y + this.playerHeight
      if (this.isSneaking) y -= 0.3
      new TWEEN.Tween(this.camera.position).to({ x: pos.x, y, z: pos.z }, 50).start()
    }
    this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
  }

  focusOnPosition(pos, controls) {
    if(controls) {
      // Calculate the initial offset between the camera (controls.object) and its current target
      const initialOffset = new THREE.Vector3().subVectors(controls.object.position, controls.target);

      // Set the end position for the target
      const newTarget = new THREE.Vector3(pos.x, pos.y, pos.z);

      // Start a tween for the target
      new TWEEN.Tween(controls.target)
          .to({x: newTarget.x, y: newTarget.y, z: newTarget.z}, 800)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(() => {
              // As the target moves, calculate the new position for the camera using the updated target and the initial offset
              controls.object.position.x = controls.target.x + initialOffset.x;
              controls.object.position.y = controls.target.y + initialOffset.y;
              controls.object.position.z = controls.target.z + initialOffset.z;

              // Optional: Update the controls in each frame if needed
              controls.update();
          })
          .start();
    }
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

  update () {
    TWEEN.update()
  }

  async waitForChunksToRender () {
    await this.world.waitForChunksToRender()
  }
}

module.exports = { Viewer }
