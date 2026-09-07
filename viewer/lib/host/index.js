// A host is everything the viewer needs from its platform, so the rendering
// code has no idea whether it runs in a browser, in node under headless-gl or
// in electron. Bundlers swap ./node for ./browser through the package.json
// "browser" field.
//
//   loadImage(name) -> Promise<{ width, height, data }>  RGBA bytes, top row first
//   loadJSON(name) -> Promise<object>
//   loadText(name) -> Promise<string>
//   createWorker() -> { postMessage(msg, transfer), onMessage(cb), terminate() }
//   now() -> milliseconds
//   renderText(text) -> { width, height, data } | null   (optional: username sprites)
//
// name is an asset path under public/ ("textures/1.16.4.png",
// "blocksStates/1.16.4.json") or an http(s) URL (player skins).

function defaultHost () {
  if (globalThis.isElectron) return require('./electron').createElectronHost()
  if (typeof window !== 'undefined') return require('./browser').createBrowserHost()
  return require('./node').createNodeHost()
}

module.exports = { defaultHost }
