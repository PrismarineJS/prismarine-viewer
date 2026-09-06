/* global postMessage self */
// Web Worker shell of the mesher; the webpack entry behind public/worker.js
const { createMesher, TICK_MS } = require('./mesher')

const mesher = createMesher((msg, transfer) => postMessage(msg, transfer))
self.onmessage = ({ data }) => mesher.handle(data)
setInterval(() => mesher.tick(), TICK_MS)
