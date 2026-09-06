function safeRequire (path) {
  try {
    return require(path)
  } catch (e) {
    return {}
  }
}
const { spawn } = require('child_process')
const net = require('net')
const THREE = require('three')
const { createCanvas } = safeRequire('node-canvas-webgl/lib')

const { WorldView, Viewer, createNodeHost } = require('../viewer')

module.exports = (bot, { viewDistance = 6, output = 'output.mp4', frames = -1, fps = 20, width = 512, height = 512, logFFMPEG = false, jpegOptions, numWorkers } = {}) => {
  if (!createCanvas) throw new Error('headless needs node-canvas-webgl: npm install PrismarineJS/node-canvas-webgl')
  const canvas = createCanvas(width, height)
  const renderer = new THREE.WebGLRenderer({ canvas })
  const viewer = new Viewer(renderer, { host: createNodeHost(), numWorkers })

  function disposeGl () {
    viewer.dispose()
    // three's dispose cancels an animation frame that never existed headless
    try { renderer.dispose() } catch {}
    const gl = canvas.__gl__
    if (gl) gl.getExtension('STACKGL_destroy_context')?.destroy()
  }

  if (!viewer.setVersion(bot.version)) {
    disposeGl()
    return false
  }
  viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)

  // Load world
  const worldView = new WorldView(bot.world, viewDistance, bot.entity.position)
  viewer.listen(worldView)
  worldView.init(bot.entity.position)

  function botPosition () {
    viewer.setFirstPersonCamera(bot.entity.position, bot.entity.yaw, bot.entity.pitch)
    worldView.updatePosition(bot.entity.position)
  }

  // Output sink: ffmpeg for rtmp:// and .mp4, a raw length-prefixed JPEG stream over TCP otherwise
  const rtmpOutput = output.startsWith('rtmp://')
  const ffmpegOutput = output.endsWith('mp4')
  let client = null
  let sink = null

  if (rtmpOutput) {
    const gop = fps * 2
    const gopMin = fps
    const probesize = '42M'
    const cbr = '1000k'
    const threads = 4
    const args = `-y -r ${fps} -probesize ${probesize} -i pipe:0 -f flv -ac 2 -ar 44100 -vcodec libx264 -g ${gop} -keyint_min ${gopMin} -b:v ${cbr} -minrate ${cbr} -maxrate ${cbr} -pix_fmt yuv420p -s 1280x720 -preset ultrafast -tune film -threads ${threads} -strict normal -bufsize ${cbr} ${output}`.split(' ')
    client = spawn('ffmpeg', args)
  } else if (ffmpegOutput) {
    // Frames arrive paced at fps, so the container gets the same rate and a player-friendly pixel format
    client = spawn('ffmpeg', ['-y', '-loglevel', logFFMPEG ? 'info' : 'error', '-framerate', String(fps), '-i', 'pipe:0', '-pix_fmt', 'yuv420p', output])
  } else {
    const [host, port] = output.split(':')
    client = new net.Socket()
    client.connect(parseInt(port, 10), host)
  }

  if (rtmpOutput || ffmpegOutput) {
    if (logFFMPEG) {
      client.stdout.on('data', (data) => { console.log(`stdout: ${data}`) })
      client.stderr.on('data', (data) => { console.error(`stderr: ${data}`) })
    }
    sink = client.stdin
    sink.on('error', () => { stop() })
    client.on('exit', () => { stop() })
  } else {
    sink = client
    sink.on('error', () => { stop() })
    sink.on('close', () => { stop() })
  }

  let stopped = false
  let stopping = null
  let timer = null
  let idx = 0
  let t0 = 0
  const frameMs = 1000 / fps

  function frame () {
    if (stopped) return
    viewer.update()
    renderer.render(viewer.scene, viewer.camera)
    const jpeg = canvas.toBuffer('image/jpeg', { quality: 1, progressive: false, ...jpegOptions })
    if (!sink.writable) { stop(); return }
    if (rtmpOutput || ffmpegOutput) {
      sink.write(jpeg)
    } else {
      const size = Buffer.alloc(4)
      size.writeUInt32LE(jpeg.length, 0)
      sink.write(size)
      sink.write(jpeg)
    }
    idx++
    if (frames >= 0 && idx >= frames) { stop(); return }
    // Wall-clock pacing: frame n goes out at t0 + n / fps however long rendering took
    timer = setTimeout(frame, Math.max(0, t0 + idx * frameMs - Date.now()))
  }

  // The first frame waits for the block atlas and the meshed sections around the bot,
  // otherwise the recording opens on blank sky
  const ready = (viewer.waitForReady ? viewer.waitForReady() : Promise.resolve()).then(() => {
    if (stopped) return
    t0 = Date.now()
    frame()
  })

  // Closes the sink, waits for ffmpeg (which writes the mp4 index on stdin close) and frees the GL context
  function stop () {
    if (stopping) return stopping
    stopped = true
    stopping = (async () => {
      clearTimeout(timer)
      bot.off('move', botPosition)
      bot.off('end', onEnd)
      worldView.removeListenersFromBot(bot)
      const closed = new Promise(resolve => {
        if (rtmpOutput || ffmpegOutput) {
          if (client.exitCode !== null || client.signalCode !== null) return resolve()
          client.once('close', resolve)
        } else {
          if (client.destroyed) return resolve()
          client.once('close', resolve)
        }
      })
      if (sink.writable) sink.end()
      await closed
      disposeGl()
    })()
    return stopping
  }

  function onEnd () { stop() }

  // Register events
  bot.on('move', botPosition)
  bot.on('end', onEnd)
  worldView.listenToBot(bot)

  return { client, canvas, viewer, worldView, ready, stop }
}
