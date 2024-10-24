import "dotenv/config";
import { startBot } from "./bot.js"; // Note the .js extension is required
startBot(process.env.DISCORD_TOKEN);
