import "dotenv/config";
import { startBot } from "./src/bot.js";
startBot(process.env.DISCORD_TOKEN);
