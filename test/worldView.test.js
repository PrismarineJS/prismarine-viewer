/**
 * @jest-environment node
 */
/* eslint-env jest */

const EventEmitter = require('events')
const { Vec3 } = require('vec3')
const { WorldView } = require('../viewer/lib/worldView')

// A world whose getColumnAt stays pending until the test resolves it, so a load can be left in
// flight while the column is unloaded or the world is replaced.
function deferredWorld (name) {
  const pending = []
  return {
    pending,
    getColumnAt () {
      return new Promise(resolve => pending.push(() => resolve({ toJson: () => name })))
    }
  }
}

function setup () {
  const oldWorld = deferredWorld('old')
  const bot = new EventEmitter()
  bot.username = 'bot'
  bot.entities = {}
  bot.world = oldWorld
  const view = new WorldView(oldWorld, 4, new Vec3(0, 0, 0))
  const events = []
  view.on('loadChunk', ({ x, z, chunk }) => events.push(['load', x, z, chunk]))
  view.on('unloadChunk', ({ x, z }) => events.push(['unload', x, z]))
  view.listenToBot(bot)
  return { bot, view, events, oldWorld }
}

const pos = new Vec3(0, 0, 0)
const flush = () => new Promise(resolve => setImmediate(resolve))

describe('WorldView in-flight chunk loads', () => {
  it('drops a load that finishes after its column was unloaded', async () => {
    const { bot, view, events, oldWorld } = setup()
    bot.emit('chunkColumnLoad', pos)
    bot.emit('chunkColumnUnload', pos)
    oldWorld.pending[0]()
    await flush()
    expect(events).toEqual([['unload', 0, 0]])
    expect(view.loadedChunks['0,0']).toBeUndefined()
  })

  it('drops a load from the world the bot left across a transfer', async () => {
    const { bot, view, events, oldWorld } = setup()
    bot.emit('chunkColumnLoad', pos)
    bot.emit('chunkColumnUnload', pos)
    const newWorld = deferredWorld('new')
    bot.world = newWorld
    bot.emit('login')
    bot.emit('chunkColumnLoad', pos)
    newWorld.pending[0]()
    oldWorld.pending[0]()
    await flush()
    expect(events).toEqual([['unload', 0, 0], ['load', 0, 0, 'new']])
    expect(view.loadedChunks['0,0']).toBe(true)
  })

  it('drops a load that was superseded by a newer load of the same column', async () => {
    const { bot, events, oldWorld } = setup()
    bot.emit('chunkColumnLoad', pos)
    bot.emit('chunkColumnLoad', pos)
    oldWorld.pending[1]()
    oldWorld.pending[0]()
    await flush()
    expect(events).toEqual([['load', 0, 0, 'old']])
  })

  it('still loads a column when nothing intervenes', async () => {
    const { bot, view, events, oldWorld } = setup()
    bot.emit('chunkColumnLoad', pos)
    oldWorld.pending[0]()
    await flush()
    expect(events).toEqual([['load', 0, 0, 'old']])
    expect(view.loadedChunks['0,0']).toBe(true)
  })
})
