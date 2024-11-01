import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ChannelType,
} from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get directory name in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Import all utility functions and constants
import {
  PRICE_UPDATE_INTERVAL,
  PRICE_ANNOUNCE_INTERVAL,
  INITIAL_PRICE,
  PRICE_MEAN_CHANGE,
  PRICE_STD_DEV,
  MAX_PRICE_CHANGE,
} from "./src/utils/constants.js";
import { formatCurrency } from "./src/utils/formatters.js";
import { getEasternTime } from "./src/utils/time.js";
import { BIFFCOINData } from "./src/services/BIFFCOINData.js";

// Graph-related constants
const GRAPH_CACHE_DIR = path.join(__dirname, "..", "graph_cache");

// Bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Keep track of previous price for context
let previousPrice = INITIAL_PRICE;

// Initialize data
const data = new BIFFCOINData();

// Import all commands
async function loadCommands() {
  const commands = [];
  const commandHandlers = new Map();

  async function loadDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await loadDir(fullPath);
      } else if (entry.name.endsWith(".js")) {
        const command = await import(fullPath);
        commands.push(command.data);
        commandHandlers.set(command.data.name, command.execute);
      }
    }
  }

  await loadDir("./src/commands");
  return { commands, commandHandlers };
}

// Price update functions
const normalDistribution = (mean, stdDev) => {
  let u1 = 0,
    u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * z;
};

const updatePrice = async () => {
  data.checkDailyReset();
  previousPrice = data.price;

  let changePercent = normalDistribution(PRICE_MEAN_CHANGE, PRICE_STD_DEV);
  changePercent = Math.max(
    -MAX_PRICE_CHANGE,
    Math.min(MAX_PRICE_CHANGE, changePercent)
  );

  data.price *= 1 + changePercent;
  data.lastPriceChange = changePercent;

  console.log(
    `Price changed from ${formatCurrency(previousPrice)} to ${formatCurrency(
      data.price
    )} (${(changePercent * 100).toFixed(2)}% change)`
  );

  await data.savePriceHistory();
  return changePercent;
};

// Cleanup function
async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(GRAPH_CACHE_DIR);
    const currentTime = Date.now();

    for (const file of files) {
      const filePath = path.join(GRAPH_CACHE_DIR, file);
      const stats = await fs.stat(filePath);
      if (currentTime - stats.mtimeMs > 60 * 60 * 1000) {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old files:", error);
  }
}

// Event handlers
client.once("ready", async () => {
  console.log(`Bot is ready as ${client.user.tag}`);
  await data.load();
  await data.ensureDataDirectory();

  // Load commands
  const { commands, commandHandlers } = await loadCommands();

  // Register commands
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("Slash commands registered");
  } catch (error) {
    console.error("Error registering slash commands:", error);
  }

  // Create necessary directories
  try {
    await fs.mkdir(GRAPH_CACHE_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error("Error creating graph cache directory:", error);
    }
  }

  // Set up intervals
  setInterval(async () => {
    const changePercent = await updatePrice();
    await data.save();
  }, PRICE_UPDATE_INTERVAL);

  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      const bfcnChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText && channel.name === "bfcn"
      );

      if (bfcnChannel) {
        const currentTimeEST = getEasternTime();
        const lastChange = ((data.price - previousPrice) / previousPrice) * 100;

        try {
          // Get 24h price history
          const history = await data.getPriceHistory();
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const dayHistory = history.filter(
            (entry) => entry.timestamp > oneDayAgo
          );

          let dayStartPrice = data.price;
          if (dayHistory.length > 0) {
            dayStartPrice = dayHistory[0].price;
          }

          const dayChange =
            ((data.price - dayStartPrice) / dayStartPrice) * 100;
          const changeEmoji = dayChange >= 0 ? "📈" : "📉";
          const changeColor = dayChange >= 0 ? "🟢" : "🔴";

          // Use the graph command's execute function
          const graphCommand = commandHandlers.get("graph");
          const { image } = await graphCommand(null, data, "24h", true);

          await bfcnChannel.send({
            content: [
              `📊 BIFFCOIN Market Update 📊\n`,
              `Previous Price: ${formatCurrency(previousPrice)}`,
              `Current Price: ${formatCurrency(data.price)}`,
              `Last Change: ${lastChange.toFixed(2)}%`,
              `24h Change: ${changeColor} ${
                dayChange >= 0 ? "+" : ""
              }${dayChange.toFixed(2)}%`,
              `24h Start: ${formatCurrency(dayStartPrice)}`,
              `Time (EST): ${currentTimeEST}\n`,
              `Next market update in 1 hour`,
            ].join("\n"),
            files: [{ attachment: image, name: "price_chart.png" }],
          });
        } catch (error) {
          console.error("Error sending price announcement:", error);
          await bfcnChannel.send(
            `📊 BIFFCOIN Market Update 📊\n\n` +
              `Previous Price: ${formatCurrency(previousPrice)}\n` +
              `Current Price: ${formatCurrency(data.price)}\n` +
              `Change: ${lastChange.toFixed(2)}%\n` +
              `Time (EST): ${currentTimeEST}\n\n` +
              `Next market update in 1 hour`
          );
        }
      }
    }
  }, 60 * 60 * 1000); // Changed to 1 hour

  setInterval(cleanupOldFiles, 60 * 60 * 1000);
});

// Command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const handler = commandHandlers.get(interaction.commandName);
  if (!handler) return;

  try {
    await handler(interaction, data);
  } catch (error) {
    console.error("Error handling command:", error);
    await interaction.reply({
      content: "An error occurred while processing your command.",
      ephemeral: true,
    });
  }
});

const startBot = (token) => {
  client.login(token);
};

export { startBot };
