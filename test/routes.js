const assert = require('assert')
const { once } = require('events')
const express = require('express')
const { setupRoutes } = require('../lib/common')

async function main () {
  const originalFetch = global.fetch
  const requests = []
  global.fetch = async url => {
    requests.push(url)
    return { ok: true, arrayBuffer: async () => Buffer.from('skin') }
  }
  const app = express()
  setupRoutes(app, '/viewer')
  const server = app.listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const base = `http://127.0.0.1:${server.address().port}/viewer`
    const response = await originalFetch(base + '/texture/abc123')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.headers.get('content-type'), 'image/png')
    assert.strictEqual(await response.text(), 'skin')
    assert.deepStrictEqual(requests, ['https://textures.minecraft.net/texture/abc123'])
    assert.strictEqual((await originalFetch(base + '/texture/not-a-hash')).status, 404)
    assert.strictEqual(requests.length, 1)
    console.log('Shared texture route serves skins under a prefix and rejects non-hash paths')
  } finally {
    global.fetch = originalFetch
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
}
main().catch(err => { console.error(err); process.exitCode = 1 })
