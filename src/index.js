/* global THREE */
global.THREE = require('three')
require('three/examples/js/controls/OrbitControls')
const { World } = require('./world')
const { Entities } = require('./entities')

const io = require('socket.io-client')
const socket = io()

const scene = new THREE.Scene()
scene.background = new THREE.Color('lightblue')

function addLight (x, y, z) {
  const color = 0xFFFFFF
  const intensity = 1
  const light = new THREE.DirectionalLight(color, intensity)
  light.position.set(x, y, z)
  scene.add(light)
}
addLight(-1, 2, 4)
addLight(1, -1, -2)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const world = new World(scene)
const entities = new Entities(scene)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new THREE.OrbitControls(camera, renderer.domElement)

function animate () {
  window.requestAnimationFrame(animate)
  controls.update()
  world.update()
  renderer.render(scene, camera)
}
animate()

socket.on('version', (version) => {
  console.log('Using version: ' + version)
  const Chunk = require('prismarine-chunk')(version)

  socket.on('position', (pos) => {
    console.log(pos)
    controls.target.set(pos.x, pos.y, pos.z)

    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6)
    geometry.translate(0, 0.9, 0)
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(pos.x, pos.y, pos.z)
    scene.add(cube)
  })

  socket.on('entity', (e) => {
    entities.update(e)
  })

  socket.on('chunk', (data) => {
    const chunk = Chunk.fromJson(data.chunk)
    console.log(data.coords)
    const [x, z] = data.coords.split(',')
    world.addColumn(parseInt(x, 10), parseInt(z, 10), chunk)
  })
})
