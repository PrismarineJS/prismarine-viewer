# Viewer

Viewer library provides Viewer and WorldView which together make it possible to render a minecraft world.

## API

### Viewer

The viewer exposes methods to render a world to a three.js renderer.

#### Viewer(renderer, options = {})

Build the viewer.

* renderer is a [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) instance
* options.host is a [host](#hosts); defaults to the browser host on a page, the electron host when `globalThis.isElectron` is set, and the node host otherwise
* options.numWorkers is the number of mesher workers (default 4)

#### host

the host the viewer loads assets and spawns workers through

#### dispose ()

Removes everything from the scene and terminates the mesher workers.

#### version

the currently used minecraft version

#### setVersion(version)

sets the minecraft version

* version is a string such as "1.16.4"

Returns false and stop there if the version is not supported

#### addColumn (x, z, chunk)

Adds a column

* x is a chunk position
* z is a chunk position
* chunk is a prismarine-chunk

#### removeColumn (x, z)

Removes a column

* x is a chunk position
* z is a chunk position

#### setBlockStateId (pos, stateId)

Set a block at this position 

* pos is a Vec3
* stateId is a number

#### updateEntity (e)

Updates an entity

* e is a prismarine-entity

#### updatePrimitive (p)

Updates a primitive

* p is a Three.js primitive

#### setFirstPersonCamera (pos, yaw, pitch)

Sets the first person camera

* pos is a Vec3 (if pos is null, only yaw and pitch will be updated)
* yaw is in degrees
* pitch is in degrees

#### listen (emitter)

listen to an emitter and applies its modification
the emitter should emit these events:
* entity(e) ; updates an entity
* primitive(p) ; updates a primitive
* loadChunk({x, z, chunk}) ; add a column
* unloadChunk({x, z}) ; removes a column
* blockUpdate({pos, stateId}) ; update a block
it also listen to these events:
* mouseClick({ origin, direction, button })

#### update ()

Update the world. This need to be called in the animate function, just before the render.

#### waitForChunksToRender ()

Returns a promise that resolve once all sections marked dirty have been rendered by the worker threads. Can be used to wait for chunks to 'appear'.

### Hosts

A host is everything the viewer needs from its platform. The rendering code only talks to the host, so the same Viewer runs in a browser, in node under headless-gl or node-canvas-webgl, and in electron.

```js
{
  loadImage (name),   // -> Promise<{ width, height, data }>: RGBA bytes, top row first
  loadJSON (name),    // -> Promise<object>
  createWorker (),    // -> { postMessage (msg, transfer), onMessage (cb), terminate () }
  now (),             // -> milliseconds
  renderText (text)   // -> { width, height, data } or null; optional, draws username labels
}
```

`name` is an asset path under `public/` (`textures/1.16.4.png`, `blocksStates/1.16.4.json`) or an http(s) URL (player skins).

#### createNodeHost({ assetsDir, fetch, workerFile, inlineMesher })

Reads assets from the prerendered `public/` directory (or the given `assetsDir`), fetches URLs with `fetch`, meshes on `worker_threads` (or on the calling thread with `inlineMesher: true`, which saves a copy of the block data per worker), and draws labels with `canvas` when it is installed. Needs no native module besides the renderer you bring.

#### createBrowserHost({ assetsUrl, workerUrl, textureProxy })

Fetches assets relative to the page (`assetsUrl` prefix), meshes on a Web Worker loaded from `workerUrl` (default `worker.js`), and rewrites `textures.minecraft.net` skin URLs to the `textureProxy` route (default `texture/`, the one `mineflayer` mode serves; `null` to fetch skins directly).

#### createElectronHost({ assetsDir, workerUrl })

Node loaders with the page's Web Worker and canvas, for a renderer with node integration.

#### defaultHost()

The host `Viewer` picks when none is given. Bundlers replace the node host with the browser host through the package's `browser` field.

### WorldView

WorldView represents the world from a player/camera point of view

#### WorldView(world, viewDistance, position = new Vec3(0, 0, 0), emitter = null)

Build a WorldView

* world is a prismarine-world
* viewDistance is the number of considered chunks
* position is the position of the camera
* emitter is the event emitter to connect (could be null to set emitter to itself or a socket)

#### WorldView.listenToBot(bot)

listen to events from a mineflayer bot

#### WorldView.removeListenersFromBot(bot)

stop listening to the bot event

#### WorldView.init(pos)

start emitting chunks from that position

#### WorldView.loadChunk(pos)

emit chunks at this position

#### WorldView.unloadChunk(pos)

emit unload chunk at this position

#### WorldView.updatePosition(pos)

change the camera position, and emit corresponding events

### MapControls

Default third person controls based on three.js OrbitControls. Refer to the [documentation here](https://threejs.org/docs/#examples/en/controls/OrbitControls). Controls are applied on animation loop, so you need to call `controls.update()` in your render loop.

##### .controlMap
The keyboard controls to use. You can provide an array for any of the keys that bind to an action. Defaults:

```js
this.controlMap = {
  MOVE_FORWARD: ['KeyW', 'KeyZ'],
  MOVE_BACKWARD: 'KeyS',
  MOVE_LEFT: ['KeyA', 'KeyQ'],
  MOVE_RIGHT: 'KeyD',
  MOVE_DOWN: 'ShiftLeft',
  MOVE_UP: 'Space'
}
```

##### setRotationOrigin(pos: THREE.Vector3)
Sets the center point for rotations

##### .verticalTranslationSpeed
How much the y axis is offset for each vertical translation (movement up and down). To control panning speed for the x/z axis, adjust [`.keyPanSpeed`](https://threejs.org/docs/#examples/en/controls/OrbitControls.keyPanSpeed)

##### .enableTouchZoom, .enableTouchRotate, .enableTouchPan
Booleans to toggle touch interaction

##### .registerHandlers(), .unregisterHandlers()
Enables and disables DOM event handling. Useful if you only want to programatically adjust the controls.