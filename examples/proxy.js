const mc = require('minecraft-protocol')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const gamePlugin = require('mineflayer/lib/plugins/game')
const healthPlugin = require('mineflayer/lib/plugins/health')
const blocksPlugin = require('mineflayer/lib/plugins/blocks')
const entitiesPlugin = require('mineflayer/lib/plugins/entities')

const states = mc.states

if (process.argv.length < 4) {
  console.log('usage: node proxy.js <target_srv> <version>')
  process.exit(1)
}

const args = process.argv.slice(2)
let host = args[0]
let port = 25565
const version = args[1]

if (host.indexOf(':') !== -1) {
  port = host.substring(host.indexOf(':') + 1)
  host = host.substring(0, host.indexOf(':'))
}

const srv = mc.createServer({
  'online-mode': false,
  port: 25566,
  keepAlive: false,
  version: version
})

srv.on('login', function (client) {
  const addr = client.socket.remoteAddress
  console.log('Incoming connection', '(' + addr + ')')
  let endedClient = false
  let endedTargetClient = false
  client.on('end', function () {
    endedClient = true
    console.log('Connection closed by client', '(' + addr + ')')
    if (!endedTargetClient) { targetClient.end('End') }
  })
  client.on('error', function (err) {
    endedClient = true
    console.log('Connection error by client', '(' + addr + ')')
    console.log(err.stack)
    if (!endedTargetClient) { targetClient.end('Error') }
  })
  const targetClient = mc.createClient({
    host: host,
    port: port,
    username: client.username,
    keepAlive: false,
    version: version
  })
  client.on('packet', function (data, meta) {
    if (targetClient.state === states.PLAY && meta.state === states.PLAY) {
      if (!endedTargetClient) { targetClient.write(meta.name, data) }
    }
  })
  targetClient.on('packet', function (data, meta) {
    if (meta.state === states.PLAY && client.state === states.PLAY) {
      if (!endedClient) {
        client.write(meta.name, data)
        if (meta.name === 'set_compression') {
          client.compressionThreshold = data.threshold
        } // Set compression
      }
    }
  })
  targetClient.on('end', function () {
    endedTargetClient = true
    console.log('Connection closed by server', '(' + addr + ')')
    if (!endedClient) { client.end('End') }
  })
  targetClient.on('error', function (err) {
    endedTargetClient = true
    console.log('Connection error by server', '(' + addr + ') ', err)
    console.log(err.stack)
    if (!endedClient) { client.end('Error') }
  })

  const { EventEmitter } = require('events')

  const bot = new EventEmitter()
  bot._client = targetClient
  bot.version = version
  bot.supportFeature = (name) => require('mineflayer/lib/supportFeature')(name, version)

  gamePlugin(bot, { version })
  healthPlugin(bot, { version })
  blocksPlugin(bot, { version })
  entitiesPlugin(bot, { version })

  client.on('position', (packet) => {
    bot.entity.position.set(packet.x, packet.y, packet.z)
    bot.emit('move')
  })

  client.on('look', (packet) => {
    bot.entity.yaw = packet.yaw
    bot.entity.pitch = packet.pitch
    bot.emit('move')
  })

  client.on('position_look', (packet) => {
    bot.entity.position.set(packet.x, packet.y, packet.z)
    bot.entity.yaw = packet.yaw
    bot.entity.pitch = packet.pitch
    bot.emit('move')
  })

  targetClient.on('chat', (packet) => {
    // console.log(packet.message)
  })

  bot.once('spawn', () => {
    mineflayerViewer(bot, { viewDistance: 12, port: 3000 })

    let pos1 = null
    let pos2 = null
    bot.viewer.on('blockClicked', (block, face, button) => {
      if (button !== 2) return

      pos2 = pos1
      pos1 = block.position
      if (pos1 && pos2) {
        const start = { x: Math.min(pos1.x, pos2.x), y: Math.min(pos1.y, pos2.y), z: Math.min(pos1.z, pos2.z) }
        const end = { x: Math.max(pos1.x, pos2.x) + 1, y: Math.max(pos1.y, pos2.y) + 1, z: Math.max(pos1.z, pos2.z) + 1 }
        bot.viewer.drawBoxGrid('selection', start, end)
      }
    })

    const { Schematic } = require('prismarine-schematic')
    const fs = require('fs').promises
    const readline = require('readline')
    const { Vec3 } = require('vec3')
    const { performance } = require('perf_hooks')

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.on('line', async (input) => {
      if (!pos1 || !pos2) {
        console.log('Select something first.')
        return
      }
      if (input.startsWith('save')) {
        const file = input.split(' ')[1]
        console.log(`Saving to: ${file}`)

        const start = new Vec3(Math.min(pos1.x, pos2.x), Math.min(pos1.y, pos2.y), Math.min(pos1.z, pos2.z))
        const end = new Vec3(Math.max(pos1.x, pos2.x), Math.max(pos1.y, pos2.y), Math.max(pos1.z, pos2.z))
        const offset = new Vec3(0, 0, 0)

        const t1 = performance.now()
        const schematic = await Schematic.copy(bot.world, start, end, offset, bot.version)
        const t2 = performance.now()
        console.log(`Time: ${t2 - t1} ms`)
        console.log(schematic.size)
        await fs.writeFile(file, await schematic.write())
      } else if (input.startsWith('expand')) {
        const [, x, y, z] = input.split(' ')
        const start = new Vec3(Math.min(pos1.x, pos2.x), Math.min(pos1.y, pos2.y), Math.min(pos1.z, pos2.z))
        const end = new Vec3(Math.max(pos1.x, pos2.x), Math.max(pos1.y, pos2.y), Math.max(pos1.z, pos2.z))

        pos1 = start
        pos2 = end.offset(parseInt(x, 10), parseInt(y, 10), parseInt(z, 10))
      } else if (input.startsWith('translate')) {
        const [, x, y, z] = input.split(' ')
        pos1 = pos1.offset(parseInt(x, 10), parseInt(y, 10), parseInt(z, 10))
        pos2 = pos2.offset(parseInt(x, 10), parseInt(y, 10), parseInt(z, 10))
      }

      const start = { x: Math.min(pos1.x, pos2.x), y: Math.min(pos1.y, pos2.y), z: Math.min(pos1.z, pos2.z) }
      const end = { x: Math.max(pos1.x, pos2.x) + 1, y: Math.max(pos1.y, pos2.y) + 1, z: Math.max(pos1.z, pos2.z) + 1 }
      bot.viewer.drawBoxGrid('selection', start, end)
    })
  })
})
