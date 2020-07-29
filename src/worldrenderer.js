/* global THREE Worker */

class WorldRenderer {
  constructor (scene) {
    this.sectionMeshs = {}
    this.scene = scene
    this.loadedChunks = {}

    const texture = new THREE.TextureLoader().load('texture.png')
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.flipY = false
    this.material = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true, transparent: true, alphaTest: 0.1 })

    // TODO: multi workers ?
    this.worker = new Worker('worker.js')
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'geometry') {
        let mesh = this.sectionMeshs[data.key]
        if (mesh) this.scene.remove(mesh)

        const chunkCoords = data.key.split(',')
        if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]]) return

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
        geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
        geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
        geometry.setIndex(data.geometry.indices)

        mesh = new THREE.Mesh(geometry, this.material)
        mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
        this.sectionMeshs[data.key] = mesh
        this.scene.add(mesh)
      }
    }
  }

  setVersion (version) {
    for (const mesh of Object.values(this.sectionMeshs)) {
      this.scene.remove(mesh)
    }
    this.sectionMeshs = {}
    this.worker.postMessage({ type: 'version', version })
  }

  addColumn (x, z, chunk) {
    this.loadedChunks[`${x},${z}`] = true
    this.worker.postMessage({ type: 'chunk', x, z, chunk })
  }

  removeColumn (x, z) {
    delete this.loadedChunks[`${x},${z}`]
    this.worker.postMessage({ type: 'unloadChunk', x, z })
    for (let y = 0; y < 256; y += 16) {
      const key = `${x},${y},${z}`
      const mesh = this.sectionMeshs[key]
      if (mesh) this.scene.remove(mesh)
    }
  }

  setBlockStateId (pos, stateId) {
    this.worker.postMessage({ type: 'blockUpdate', pos, stateId })
  }
}

module.exports = { WorldRenderer }
