// worker_threads shell of the mesher, spawned by the node host
const { parentPort } = require('worker_threads')
const { createMesher, TICK_MS } = require('./mesher')

const mesher = createMesher((msg, transfer) => parentPort.postMessage(msg, transfer))
parentPort.on('message', (data) => mesher.handle(data))
setInterval(() => mesher.tick(), TICK_MS)
