import * as mineflayer from 'mineflayer';
import {mineflayer as mineflayerLoader} from 'prismarine-viewer';


const bot = mineflayer.createBot({
  username: 'Bot',
  host: 'node2.meowbot.de',
  port: 5000,
  version: '1.16.5'
});

bot.once('spawn', async () => {
  mineflayerLoader(bot, { port: 3000 });

  
  await bot.waitForTicks(20);
  bot.chat('test');
  await bot.waitForTicks(20);
  bot.chat('test');

  const path: any[] = [bot.entity.position.clone()]; // You can replace 'any' with a more specific type if needed
  bot.on('move', () => {
    if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
      path.push(bot.entity.position.clone());
      bot.viewer.drawLine('path', path); // Removed the trailing comma as it was causing a syntax error
    }
  });
});
