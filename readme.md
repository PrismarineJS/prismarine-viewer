# Prismarine-Viewer

## Example

```js
const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer

const bot = mineflayer.createBot({
  username: 'Bot'
})

bot.once('spawn', () => {
  mineflayerViewer(bot, 3000) // Start the viewing server on port 3000

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