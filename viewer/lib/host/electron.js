const { createNodeHost } = require('./node')
const { createBrowserHost } = require('./browser')

// Host for an electron renderer with node integration: assets come off disk
// like in node, while meshing and text use the page's Web Worker and canvas.
// workerUrl must point at a script that loads viewer/lib/worker.js (see
// examples/electron/client/worker.js).
function createElectronHost ({ assetsDir, workerUrl = 'worker.js' } = {}) {
  const node = createNodeHost({ assetsDir })
  const browser = createBrowserHost({ workerUrl, textureProxy: null })
  return {
    loadImage: node.loadImage,
    loadJSON: node.loadJSON,
    createWorker: browser.createWorker,
    now: browser.now,
    renderText: browser.renderText
  }
}

module.exports = { createElectronHost }
