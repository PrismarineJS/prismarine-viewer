import * as mineflayer from "mineflayer";
import { mineflayer as mineflayerLoader } from "prismarine-viewer";

import type { Vec3 } from "vec3";

const bot = mineflayer.createBot({
  username: "Bot",
});

bot.once("spawn", async () => {
  mineflayerLoader(bot, { port: 3000 });

  const path: Vec3[] = [bot.entity.position.clone()];
  if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
    path.push(bot.entity.position.clone());
    bot.viewer.drawLine("path", path);
  }
});
