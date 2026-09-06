const THREE = require('three')
const Vec3 = require('vec3').Vec3
const { EventEmitter } = require('events')
const { dispose3 } = require('./dispose')
const { defaultHost } = require('./host')
const { loadTexture } = require('./textures')

function mod (x, n) {
  return ((x % n) + n) % n
}

class WorldRenderer {
  constructor (scene, options = {}) {
    if (typeof options === 'number') options = { numWorkers: options }
    const { host = defaultHost(), numWorkers = 4 } = options
    this.host = host
    this.sectionMeshs = {}
    this.active = false
    this.version = undefined
    this.assetsVersion = undefined
    this.scene = scene
    this.loadedChunks = {}
    this.sectionsOutstanding = new Set()
    this.renderUpdateEmitter = new EventEmitter()
    this.blockStatesData = undefined
    this.texturesDataUrl = undefined

    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, alphaTest: 0.1 })
    // Animated textures are packed as vertical runs of tiles; each vertex
    // carries (frames, frametime) and the shader steps down the run in ticks.
    this.uniforms = { time: { value: 0 }, tileHeight: { value: 0 } }
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', 'attribute vec2 animation;\nuniform float time;\nuniform float tileHeight;\n#include <common>')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_UV\nvUv.y += mod(floor(time / animation.y), animation.x) * tileHeight;\n#endif')
    }

    this.workers = []
    for (let i = 0; i < numWorkers; i++) {
      const worker = host.createWorker()
      worker.onMessage((data) => this.onWorkerMessage(data))
      this.workers.push(worker)
    }
  }

  onWorkerMessage (data) {
    if (data.type === 'geometry') {
      let mesh = this.sectionMeshs[data.key]
      if (mesh) {
        this.scene.remove(mesh)
        dispose3(mesh)
        delete this.sectionMeshs[data.key]
      }

      const chunkCoords = data.key.split(',')
      if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]]) return

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
      geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
      geometry.setAttribute('animation', new THREE.BufferAttribute(data.geometry.animations, 2))
      geometry.setIndex(data.geometry.indices)

      mesh = new THREE.Mesh(geometry, this.material)
      mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
      this.sectionMeshs[data.key] = mesh
      this.scene.add(mesh)
    } else if (data.type === 'sectionFinished') {
      this.sectionsOutstanding.delete(data.key)
      this.renderUpdateEmitter.emit('update')
    }
  }

  dispose () {
    this.resetWorld()
    for (const worker of this.workers) worker.terminate()
    this.workers = []
  }

  resetWorld () {
    this.active = false
    for (const mesh of Object.values(this.sectionMeshs)) {
      this.scene.remove(mesh)
    }
    this.sectionMeshs = {}
    for (const worker of this.workers) {
      worker.postMessage({ type: 'reset' })
    }
  }

  setVersion (version, assetsVersion = version) {
    this.version = version
    this.assetsVersion = assetsVersion
    this.resetWorld()
    this.active = true
    for (const worker of this.workers) {
      worker.postMessage({ type: 'version', version })
    }

    this.updateTexturesData()
  }

  updateTexturesData () {
    loadTexture(this.host, this.texturesDataUrl || `textures/${this.assetsVersion}.png`).then(texture => {
      if (!texture) return
      this.uniforms.tileHeight.value = 16 / texture.image.height
      this.material.map = texture
      this.material.needsUpdate = true
    })

    const blockStates = this.blockStatesData
      ? Promise.resolve(this.blockStatesData)
      : this.host.loadJSON(`blocksStates/${this.assetsVersion}.json`)
    blockStates.then((json) => {
      for (const worker of this.workers) {
        worker.postMessage({ type: 'blockStates', json })
      }
    })
  }

  update () {
    this.uniforms.time.value = this.host.now() / 50
  }

  addColumn (x, z, chunk) {
    this.loadedChunks[`${x},${z}`] = true
    for (const worker of this.workers) {
      worker.postMessage({ type: 'chunk', x, z, chunk })
    }
    for (let y = 0; y < 256; y += 16) {
      const loc = new Vec3(x, y, z)
      this.setSectionDirty(loc)
      this.setSectionDirty(loc.offset(-16, 0, 0))
      this.setSectionDirty(loc.offset(16, 0, 0))
      this.setSectionDirty(loc.offset(0, 0, -16))
      this.setSectionDirty(loc.offset(0, 0, 16))
    }
  }

  removeColumn (x, z) {
    delete this.loadedChunks[`${x},${z}`]
    for (const worker of this.workers) {
      worker.postMessage({ type: 'unloadChunk', x, z })
    }
    for (let y = 0; y < 256; y += 16) {
      this.setSectionDirty(new Vec3(x, y, z), false)
      const key = `${x},${y},${z}`
      const mesh = this.sectionMeshs[key]
      if (mesh) {
        this.scene.remove(mesh)
        dispose3(mesh)
      }
      delete this.sectionMeshs[key]
    }
  }

  setBlockStateId (pos, stateId) {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'blockUpdate', pos, stateId })
    }
    this.setSectionDirty(pos)
    if ((pos.x & 15) === 0) this.setSectionDirty(pos.offset(-16, 0, 0))
    if ((pos.x & 15) === 15) this.setSectionDirty(pos.offset(16, 0, 0))
    if ((pos.y & 15) === 0) this.setSectionDirty(pos.offset(0, -16, 0))
    if ((pos.y & 15) === 15) this.setSectionDirty(pos.offset(0, 16, 0))
    if ((pos.z & 15) === 0) this.setSectionDirty(pos.offset(0, 0, -16))
    if ((pos.z & 15) === 15) this.setSectionDirty(pos.offset(0, 0, 16))
  }

  setSectionDirty (pos, value = true) {
    // Dispatch sections to workers based on position
    // This guarantees uniformity accross workers and that a given section
    // is always dispatched to the same worker
    const hash = mod(Math.floor(pos.x / 16) + Math.floor(pos.y / 16) + Math.floor(pos.z / 16), this.workers.length)
    // outstanding before the post: an inline worker answers synchronously
    this.sectionsOutstanding.add(`${Math.floor(pos.x / 16) * 16},${Math.floor(pos.y / 16) * 16},${Math.floor(pos.z / 16) * 16}`)
    this.workers[hash].postMessage({ type: 'dirty', x: pos.x, y: pos.y, z: pos.z, value })
  }

  // Listen for chunk rendering updates emitted if a worker finished a render and resolve if the number
  // of sections not rendered are 0
  waitForChunksToRender () {
    return new Promise((resolve, reject) => {
      if (Array.from(this.sectionsOutstanding).length === 0) {
        resolve()
        return
      }

      const updateHandler = () => {
        if (this.sectionsOutstanding.size === 0) {
          this.renderUpdateEmitter.removeListener('update', updateHandler)
          resolve()
        }
      }
      this.renderUpdateEmitter.on('update', updateHandler)
    })
  }
}

module.exports = { WorldRenderer }
