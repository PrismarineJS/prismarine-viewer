// Exercise the shipped bundle, not the unbundled Node module/dependency tree.
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Worker } = require('worker_threads')
const { Vec3 } = require('vec3')
const { supportedVersions } = require('../viewer/lib/version')

async function main () {
  const bundle = path.join(__dirname, '../public/worker.js')
  // Allow normal Java registry growth across supported dependency releases.
  // The accidental Bedrock payload alone used over 70 MiB.
  assert(fs.statSync(bundle).size < 32 * 1024 * 1024, 'Worker exceeds 32 MiB; check for unused registry data')
  for (const version of supportedVersions) {
    const worker = new Worker(bundle)
    try {
      const Chunk = require('prismarine-chunk')(version)
      const chunk = new Chunk()
      const stone = require('minecraft-data')(version).blocksByName.stone
      const pos = new Vec3(8, 72, 8)
      chunk.setBlockStateId(pos, stone.defaultState)
      const geometry = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Worker timed out: ${version}`)), 15000)
        worker.on('error', err => { clearTimeout(timeout); reject(err) })
        worker.on('message', message => {
          if (message.type === 'geometry') { clearTimeout(timeout); resolve(message.geometry) }
        })
        worker.postMessage({ type: 'version', version })
        worker.postMessage({ type: 'blockStates', json: JSON.parse(fs.readFileSync(path.join(__dirname, '../public/blocksStates', version + '.json'))) })
        worker.postMessage({ type: 'chunk', x: 0, z: 0, chunk: chunk.toJson() })
        worker.postMessage({ type: 'dirty', x: 0, y: 64, z: 0, value: true })
      })
      assert(geometry.positions.length > 0, `Empty stone geometry: ${version}`)
      assert([...geometry.positions, ...geometry.uvs].every(Number.isFinite), `Invalid geometry: ${version}`)
      console.log(`Bundled worker renders ${version}`)
    } finally {
      await worker.terminate()
    }
  }
}
main().catch(err => { console.error(err); process.exitCode = 1 })
