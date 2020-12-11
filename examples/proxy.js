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
    console.log(packet.message)
  })

  mineflayerViewer(bot, { viewDistance: 12, port: 3000 })
})
