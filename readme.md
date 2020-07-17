# prismarine-viewer

Web based viewer for servers and bots

[![NPM version](https://img.shields.io/npm/v/prismarine-viewer.svg)](http://npmjs.com/package/prismarine-viewer)
[![Build Status](https://github.com/PrismarineJS/prismarine-viewer/workflows/CI/badge.svg)](https://github.com/PrismarineJS/prismarine-viewer/actions?query=workflow%3A%22CI%22)
[![Discord](https://img.shields.io/badge/chat-on%20discord-brightgreen.svg)](https://discord.gg/GsEFRM8)
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-brightgreen.svg)](https://gitter.im/PrismarineJS/general)
[![Irc](https://img.shields.io/badge/chat-on%20irc-brightgreen.svg)](https://irc.gitter.im/)

[![Try it on gitpod](https://img.shields.io/badge/try-on%20gitpod-brightgreen.svg)](https://gitpod.io/#https://github.com/PrismarineJS/prismarine-viewer)

[<img src="https://prismarine.js.org/prismarine-viewer/test_1.16.1.png" alt="viewer" width="300">](https://prismarine.js.org/prismarine-viewer/)

## Install

```bash
npm install prismarine-viewer
```

## Example

```js
const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.once('spawn', () => {
  mineflayerViewer(bot, { port: 3000 }) // Start the viewing server on port 3000

  // Draw the path followed by the bot
  const path = [bot.entity.position.clone()]
  bot.on('move', () => {
    if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
      path.push(bot.entity.position.clone())
      bot.viewer.drawLine('path', path)
    }
  })
})
```

## API

All drawing function have a unique id that can be used to replace or erase the primitive.

### bot.viewer.drawLine (id, points, color=0xff0000)

Draw a line passing through all the `points`.

### bot.viewer.erase (id)

Remove the primitive with the given id from the display.

## Tests

`node_modules/.bin/jest --verbose --runInBand --forceExit -t "1.16.1"`
