# Viewer

Viewer library provides Viewer and WorldView which together make it possible to render a minecraft world.

## API

### Viewer

The viewer exposes methods to render a world to a three.js renderer.

#### Viewer(renderer)

Build the viewer.

* renderer is a Tree.js instance

#### setVersion(version)

sets the minecraft version

* version is a string such as "1.16.4"

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

* pos is a Vec3
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

### WorldView

WorldView represents the world from a player/camera point of view

#### WorldView(world, viewDistance, position = new Vec3(0, 0, 0))

Build a WorldView

* world is a prismarine-world
* viewDistance is the number of considered chunks
* position is the position of the camera

#### WorldView.forward(emitter)

start emitting to the specified emitter.
Will emit the events specified above for Viewer

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
