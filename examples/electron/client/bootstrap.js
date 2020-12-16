const LocalViewer = require('./localViewer')

const World = require('prismarine-world')

// TODO: Better way to do inputs
async function prompt(message, defaultMessage) {
  return new Promise(ret => {
    let element = document.querySelector('#prompt')
    if (!element)
      document.body.innerHTML += `<div id="prompt"></div>`
    element = document.querySelector('#prompt')
    element.innerHTML = `
    <div>${message}</div>
    <input id="prompt-val" type="text" value="${defaultMessage}" />
    <button onclick="btnOk()">OK</button>
    <button onclick="btnCancel()">Cancel</button>`
  
    window.btnOk = function() {
      let val = document.querySelector('#prompt-val').value
      element?.remove()
      ret(val)
    }
  
    window.btnCancel = function() {
      element?.remove()
      ret(false)
    }
  })
}

async function openWorld(path, version) {
  if (!path) return
  try {
    if (!version) throw 0;
    let provider = World(version)
  } catch (e) {
    console.log(e)
    version = await prompt('Version to load world as', '1.13.1')
    if (!version) return
    openWorld(path, version)
    return
  }

  console.info('[app] loading %s world at "%s"', version, path)

  removeSplash()

  global.viewer = new LocalViewer(version, path)
  viewer.start()
}

async function startmf(props) {
  if (!props) {
    props = {}

  }
}

// remove so event handlers also deleted
function removeSplash() {
  document.querySelector('#splash').remove()
}

document.querySelector('#splash').ondragover = (ev) => {
  ev.preventDefault()
}

document.querySelector('#splash').ondrop = function (e) {
  console.log(e.dataTransfer.files[0].path)

  const path = e.dataTransfer.files[0].path
  let ok = confirm(`Open the save at ${path}?`)
  if (ok) openWorld(path)
}