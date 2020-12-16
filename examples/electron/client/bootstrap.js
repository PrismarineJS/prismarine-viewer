const LocalViewer = require('./localViewer')

const World = require('prismarine-world')

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
      // console.log('ok')
      element?.remove()
      ret(val)
    }
  
    window.btnCancel = function() {
      // console.log('fail')
      element?.remove()
      ret(false)
    }
  })
}

async function openWorld(path, version) {
  if (!path) return
  let provider = null
  try {
    if (!version) throw 0;
    provider = World(version)
  } catch (e) {
    console.log(e)
    version = await prompt('Version to load world as', '1.13.1')
    if (!version) return
    openWorld(path, version)
    return
  }

  console.info('[app] loading %s world at "%s"', version, path)

  hideSplash()

  global.viewer = new LocalViewer(version, path)
  viewer.start()
}

function hideSplash() {
  document.querySelector('#splash').style.display = 'none'
}

function showSplash() {
  document.querySelector('#splash').style.display = undefined
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