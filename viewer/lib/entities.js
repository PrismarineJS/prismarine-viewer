const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')

const { createCanvas } = require('canvas')

function getEntityMesh (entity, scene) {
  if (entity.name) {
    try {
      const e = new Entity('1.16.4', entity.name, scene)

      if (entity.username !== undefined) {
        // Render the nametag like vanilla: white text with a soft drop shadow
        // on a translucent black background, sized to the measured text so the
        // sprite's aspect ratio matches and doesn't squash the letters.
        const txt = entity.username
        const padX = 16
        const padY = 6
        const fontPx = 80

        const measure = createCanvas(1, 1).getContext('2d')
        measure.font = `${fontPx}px sans-serif`
        const textW = Math.ceil(measure.measureText(txt).width)

        const w = textW + padX * 2 + 2 // + shadow
        const h = fontPx + padY * 2 + 2

        const canvas = createCanvas(w, h)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'
        ctx.fillRect(0, 0, w, h)

        ctx.font = `${fontPx}px sans-serif`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillStyle = '#3f3f3f'
        ctx.fillText(txt, padX + 2, padY + 2) // shadow
        ctx.fillStyle = '#ffffff'
        ctx.fillText(txt, padX, padY)

        const tex = new THREE.Texture(canvas)
        tex.needsUpdate = true
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.anisotropy = 4
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
        const sprite = new THREE.Sprite(spriteMat)
        // Scale so the sprite is ~0.4m tall regardless of canvas pixel size,
        // and width preserves canvas aspect — fixes the "squished" look.
        const targetHeight = 0.4
        sprite.scale.set(targetHeight * (w / h), targetHeight, 1)
        sprite.position.y += entity.height + 0.6
        sprite.renderOrder = 999

        e.mesh.add(sprite)
      }
      return e.mesh
    } catch (err) {
      console.log(err)
    }
  }

  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
  const cube = new THREE.Mesh(geometry, material)
  return cube
}

class Entities {
  constructor (scene) {
    this.scene = scene
    this.entities = {}
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      dispose3(mesh)
    }
    this.entities = {}
  }

  update (entity) {
    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity, this.scene)
      if (!mesh) return
      this.entities[entity.id] = mesh
      this.scene.add(mesh)
    }

    const e = this.entities[entity.id]

    if (entity.delete) {
      this.scene.remove(e)
      dispose3(e)
      delete this.entities[entity.id]
    }

    if (entity.pos) {
      new TWEEN.Tween(e.position).to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, 50).start()
    }
    if (entity.yaw) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, 50).start()
    }
  }
}

module.exports = { Entities }
