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
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import all utility functions and constants
import {
  PRICE_UPDATE_INTERVAL,
  PRICE_ANNOUNCE_INTERVAL,
  INITIAL_PRICE,
  PRICE_MEAN_CHANGE,
  PRICE_STD_DEV,
  MAX_PRICE_CHANGE,
} from "./utils/constants.js";
import { formatCurrency } from "./utils/formatters.js";
import { getEasternTime } from "./utils/time.js";
import { BIFFCOINData } from "./services/BIFFCOINData.js";

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

// Add this at the top level
let commandHandlers = new Map();

// Import all commands
async function loadCommands() {
  const commands = [];
  commandHandlers = new Map();

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

  // Use absolute path to commands directory
  const commandsPath = path.join(__dirname, "commands");
  await loadDir(commandsPath);
  return { commands };
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
  const { commands } = await loadCommands();

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

    // Check for expired leveraged positions
    for (const [userId, positions] of data.leveragedPositions.entries()) {
      const expiredPositions = positions.filter(
        (p) => p.expiryTime <= Date.now()
      );
      if (expiredPositions.length === 0) continue;

      const wallet = data.wallets.get(userId);

      // Process each expired position
      expiredPositions.forEach((position) => {
        const priceDiff = data.price - position.initialPrice;
        const percentChange = priceDiff / position.initialPrice;

        // Calculate P&L based on direction and leverage
        const value = position.isLong
          ? position.amount * (percentChange * position.leverage) // Long: profit when price up
          : position.amount * (-percentChange * position.leverage); // Short: profit when price down

        // Calculate total proceeds (initial investment + profit/loss)
        const totalProceeds = position.amount + value;

        // Convert proceeds to BIFFCOIN at current price
        const biffcoinAmount = totalProceeds / data.price;

        // Add BIFFCOIN to wallet instead of cash
        wallet.biffcoin += biffcoinAmount;
      });

      // Remove expired positions
      data.leveragedPositions.set(
        userId,
        positions.filter((p) => p.expiryTime > Date.now())
      );

      await data.save();
    }
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
          const graphCommand = commandHandlers.get("graph");
          const { image } = await graphCommand(null, data, "24h", true);

          await bfcnChannel.send({
            content: [
              `📊 BIFFCOIN Market Update 📊\n`,
              `Previous Price: ${formatCurrency(previousPrice)}`,
              `Current Price: ${formatCurrency(data.price)}`,
              `Change: ${lastChange.toFixed(2)}%`,
              `Time (EST): ${currentTimeEST}\n`,
              `Next market update in 30 minutes`,
            ].join("\n"),
            files: [{ attachment: image, name: "price_chart.png" }],
          });
        } catch (error) {
          console.error("Error sending price announcement:", error);
          await bfcnChannel.send(
            `📊 BIFFCOIN Market Update \n\n` +
              `Previous Price: ${formatCurrency(previousPrice)}\n` +
              `Current Price: ${formatCurrency(data.price)}\n` +
              `Change: ${lastChange.toFixed(2)}%\n` +
              `Time (EST): ${currentTimeEST}\n\n` +
              `Next market update in 30 minutes`
          );
        }
      }
    }
  }, PRICE_ANNOUNCE_INTERVAL);

  setInterval(cleanupOldFiles, 60 * 60 * 1000);

  try {
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN
    );

    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }

  // After successful login
  console.log(`
🪙 BIFFCOIN Bot Configuration:
• Price updates: Every ${PRICE_UPDATE_INTERVAL / 1000} seconds
• Announcements: Every ${PRICE_ANNOUNCE_INTERVAL / (60 * 1000)} minutes
• Initial price: ${formatCurrency(INITIAL_PRICE)}
• Mean change: ${(PRICE_MEAN_CHANGE * 100).toFixed(2)}%
• Max change: ±${(MAX_PRICE_CHANGE * 100).toFixed(2)}%
`);
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

    // Check if interaction can still be replied to
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while processing your command.",
          ephemeral: true,
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: "An error occurred while processing your command.",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      // If we can't reply to the interaction, just log it
      console.error("Could not send error message:", replyError);
    }
  }
});

// Add error handler for uncaught promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Export the startBot function
export function startBot(token) {
  client.login(token);
}
