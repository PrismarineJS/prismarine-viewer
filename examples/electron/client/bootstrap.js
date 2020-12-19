/* global confirm */

const LocalViewer = require('./localViewer')

// TODO: Better way to do inputs
async function prompt (message, defaultMessage) {
  return new Promise(resolve => {
    let element = document.querySelector('#prompt')
    if (!element) { document.body.innerHTML += '<div id="prompt"></div>' }
    element = document.querySelector('#prompt')
    element.innerHTML = `
    <div>${message}</div>
    <input id="prompt-val" type="text" value="${defaultMessage}" />
    <button onclick="btnOk()">OK</button>
    <button onclick="btnCancel()">Cancel</button>`

    window.btnOk = function () {
      const val = document.querySelector('#prompt-val').value
      element?.remove()
      resolve(val)
    }

    window.btnCancel = function () {
      element?.remove()
      resolve(false)
    }
  })
}

async function openWorld (path, version) {
  if (!path) return

  if (!path.endsWith('region') && !path.endsWith('region/')) {
    path += '/region'
  }

  if (!version) {
    version = await prompt('Version to load world as', '1.13.1')
    if (!version) return
  }

  console.info('[app] loading %s world at "%s"', version, path)

  removeSplash()

  global.viewer = new LocalViewer(version, path)
  global.viewer.start()
}

// remove so event handlers also deleted
function removeSplash () {
  document.querySelector('#splash').remove()
}

document.querySelector('#splash').ondragover = (ev) => {
  ev.preventDefault()
}

document.querySelector('#splash').ondrop = function (e) {
  console.log(e.dataTransfer.files[0].path)

  const path = e.dataTransfer.files[0].path
  const ok = confirm(`Open the save at ${path}?`)
  if (ok) openWorld(path)
}
