import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} from "discord.js";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get directory name in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Constants
const INITIAL_PRICE = 0.00000001;
const INITIAL_BALANCE = 10.0;
const PRICE_UPDATE_INTERVAL = 1 * 60 * 1000; // 1 minute
const PRICE_ANNOUNCE_INTERVAL = 30 * 60 * 1000; // 30 minutes for announcements
const DATA_FILE = join(__dirname, "biffcoin_data.json");
const PRICE_MEAN_CHANGE = 0.0002; // 0.02% mean change
const PRICE_STD_DEV = 0.02; // Much smaller standard deviation
const MAX_PRICE_CHANGE = 0.05; // Maximum 5% change in either direction
const SPOOK_CHANGE = 0.5; // 50% drop
const PUMP_CHANGE = 0.5; // 50% increase
const BIFFCOIN_VERSION = "1.5";
const VERSION_NOTES = [
  "• 📊 Added /bfcnchangetoday command:",
  "  - Shows price change since midnight EST",
  "  - Displays percentage and dollar change",
  "  - Tracks daily starting price",
  "  - Automatic midnight reset",
];

// Bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Keep track of previous price for context
let previousPrice = INITIAL_PRICE;

// Helper function to get current Eastern Time
const getEasternTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
};

const getEasternDateString = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// BIFFCOIN data management
class BIFFCOINData {
  constructor() {
    this.price = INITIAL_PRICE;
    this.wallets = new Map();
    this.lastWork = new Map();
    this.lastSpook = new Map();
    this.lastPump = new Map();
    this.lastPriceChange = 0;
    this.dailyStartPrice = INITIAL_PRICE; // Add this
    this.lastResetDate = getEasternDateString(); // Add this
  }

  async save() {
    const data = {
      price: this.price,
      wallets: Object.fromEntries(this.wallets),
      lastWork: Object.fromEntries(this.lastWork),
      lastSpook: Object.fromEntries(this.lastSpook),
      lastPump: Object.fromEntries(this.lastPump),
      lastPriceChange: this.lastPriceChange,
      dailyStartPrice: this.dailyStartPrice, // Add this
      lastResetDate: this.lastResetDate, // Add this
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  }

  async load() {
    try {
      const fileContent = await fs.readFile(DATA_FILE, "utf-8");
      const data = JSON.parse(fileContent);
      this.price = data.price;
      this.wallets = new Map(Object.entries(data.wallets));
      this.lastWork = new Map(Object.entries(data.lastWork));
      this.lastSpook = new Map(Object.entries(data.lastSpook || {}));
      this.lastPump = new Map(Object.entries(data.lastPump || {}));
      this.lastPriceChange = data.lastPriceChange || 0;
      this.dailyStartPrice = data.dailyStartPrice || this.price; // Add this
      this.lastResetDate = data.lastResetDate || getEasternDateString(); // Add this
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Error loading data:", error);
      }
    }
  }

  // Add method to check and update daily price reset
  checkDailyReset() {
    const currentDateEST = getEasternDateString();
    if (currentDateEST !== this.lastResetDate) {
      this.dailyStartPrice = this.price;
      this.lastResetDate = currentDateEST;
      this.save();
    }
  }
}

const data = new BIFFCOINData();

// Helper functions for smart number formatting
// Helper functions for smart number formatting
const formatCurrency = (amount) => {
  // For very small numbers (like prices), show more decimal places
  if (amount < 0.01) {
    // Convert to string and remove trailing zeros
    const str = amount.toFixed(12).replace(/\.?0+$/, "");
    return `$${str}`;
  }

  // For regular numbers, show 2 decimal places and add commas
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatBIFFCOIN = (amount) => {
  // Round to 2 decimal places and add commas for thousands
  const formattedNum = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formattedNum} BFCN`;
};

const normalDistribution = (mean, stdDev) => {
  let u1 = 0,
    u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * z;
};

const generateWorkEarnings = () => {
  const mu = Math.log(0.1); // Center around 10 cents
  const sigma = 1.5; // Spread
  const earnings = Math.exp(mu + sigma * Math.random());
  return Math.max(0.0001, Math.min(100, earnings));
};

const updatePrice = () => {
  data.checkDailyReset();
  previousPrice = data.price;

  let changePercent = normalDistribution(PRICE_MEAN_CHANGE, PRICE_STD_DEV);
  changePercent = Math.max(
    -MAX_PRICE_CHANGE,
    Math.min(MAX_PRICE_CHANGE, changePercent)
  );

  data.price *= 1 + changePercent;
  data.lastPriceChange = changePercent; // Store it in the data object

  console.log(
    `Price changed from ${formatCurrency(previousPrice)} to ${formatCurrency(
      data.price
    )} (${(changePercent * 100).toFixed(2)}% change)`
  );
  return changePercent;
};

const calculateWalletValue = (wallet) => {
  return wallet.cash + wallet.biffcoin * data.price;
};

// Command definitions
const commands = [
  new SlashCommandBuilder()
    .setName("register_wallet")
    .setDescription("Register a new BIFFCOIN wallet"),
  new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn money (once per calendar day EST)"),
  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy BIFFCOIN")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount in dollars to spend")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("buy_all")
    .setDescription("Buy as much BIFFCOIN as possible with available funds"),
  new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell BIFFCOIN")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of BIFFCOIN to sell")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("sell_all")
    .setDescription("Sell all BIFFCOIN in your wallet"),
  new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Check your wallet balance"),
  new SlashCommandBuilder()
    .setName("price")
    .setDescription("Check current BIFFCOIN price"),
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the richest BIFFCOIN traders"),
  new SlashCommandBuilder()
    .setName("biffcoin_explain")
    .setDescription("Learn about BIFFCOIN and available commands"),
  new SlashCommandBuilder()
    .setName("version")
    .setDescription("Show current BIFFCOIN version and latest changes"),
  new SlashCommandBuilder()
    .setName("spook")
    .setDescription(
      `Attempt to spook the market (1% chance to drop price by ${(
        SPOOK_CHANGE * 100
      ).toFixed(0)}%)`
    ),
  new SlashCommandBuilder()
    .setName("pump")
    .setDescription(
      `Attempt to pump the market (1% chance to increase price by ${(
        PUMP_CHANGE * 100
      ).toFixed(0)}%)`
    ),
  new SlashCommandBuilder()
    .setName("bfcnchangetoday")
    .setDescription("Show how much BIFFCOIN has changed since midnight EST"),
];

// Command handlers
const handleRegisterWallet = async (interaction) => {
  const userId = interaction.user.id;
  if (data.wallets.has(userId)) {
    await interaction.reply("You already have a wallet!");
    return;
  }

  data.wallets.set(userId, {
    cash: INITIAL_BALANCE,
    biffcoin: 0,
  });
  await data.save();
  await interaction.reply(
    `Wallet created! You received ${formatCurrency(
      INITIAL_BALANCE
    )} initial balance.`
  );
};

const handleWork = async (interaction) => {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const currentDateEST = getEasternDateString();
  const lastWorkDate = data.lastWork.get(userId);

  if (lastWorkDate === currentDateEST) {
    await interaction.reply(
      "You've already worked today! You can work again after midnight Eastern Time."
    );
    return;
  }

  const earnings = generateWorkEarnings();
  const wallet = data.wallets.get(userId);
  wallet.cash += earnings;
  data.lastWork.set(userId, currentDateEST);
  await data.save();

  const currentTimeEST = getEasternTime();

  await interaction.reply(
    `💼 Work Complete! 💼\n\n` +
      `You earned ${formatCurrency(earnings)} from work!\n` +
      `(Work rewards range from ${formatCurrency(0.0001)} to ${formatCurrency(
        100
      )}, with an average around ${formatCurrency(0.1)})\n\n` +
      `Current time (EST): ${currentTimeEST}\n` +
      `You can work again after midnight EST.\n\n` +
      `💡 Tip: The work reward uses a log-normal distribution, meaning:\n` +
      `• Most rewards are near ${formatCurrency(0.1)}\n` +
      `• Occasionally you might get lucky with a bigger payout\n` +
      `• You'll never earn less than ${formatCurrency(
        0.0001
      )} or more than ${formatCurrency(100)}`
  );
};

const handleBuy = async (interaction) => {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const spendAmount = interaction.options.getNumber("amount");
  if (spendAmount <= 0) {
    await interaction.reply("Amount must be positive!");
    return;
  }

  const wallet = data.wallets.get(userId);
  if (wallet.cash < spendAmount) {
    await interaction.reply("Insufficient funds!");
    return;
  }

  // Always deduct the full spend amount
  wallet.cash -= spendAmount;

  let actualSpendAmount = spendAmount;
  const badLuckRoll = Math.random();
  if (badLuckRoll < 0.15) {
    const reduction = Math.random() * 0.9 + 0.1;
    actualSpendAmount *= reduction;

    const message = [
      `📉 Uh oh! You rolled ${(badLuckRoll * 100).toFixed(
        1
      )}% and hit the 15% bad luck threshold!`,
      `The market wasn't in your favor, reducing your purchase by ${(
        (1 - reduction) *
        100
      ).toFixed(1)}%\n`,
      `You spent ${formatCurrency(
        spendAmount
      )} but only received ${formatCurrency(
        actualSpendAmount
      )} worth of BIFFCOIN.`,
      `The house thanks you for your donation of ${formatCurrency(
        spendAmount - actualSpendAmount
      )}! 🎰`,
    ].join("\n");

    const biffcoinAmount = actualSpendAmount / data.price;
    wallet.biffcoin += biffcoinAmount;
    await data.save();

    await interaction.reply(message);
  } else {
    const biffcoinAmount = actualSpendAmount / data.price;
    wallet.biffcoin += biffcoinAmount;
    await data.save();

    await interaction.reply(
      `Bought ${formatBIFFCOIN(biffcoinAmount)} for ${formatCurrency(
        spendAmount
      )}`
    );
  }
};

const handleBuyAll = async (interaction) => {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const wallet = data.wallets.get(userId);
  if (wallet.cash <= 0) {
    await interaction.reply("You don't have any cash to spend!");
    return;
  }

  const spendAmount = wallet.cash;
  wallet.cash = 0;

  let actualSpendAmount = spendAmount;
  const badLuckRoll = Math.random();
  if (badLuckRoll < 0.15) {
    const reduction = Math.random() * 0.9 + 0.1;
    actualSpendAmount *= reduction;

    const message = [
      `📉 Uh oh! You rolled ${(badLuckRoll * 100).toFixed(
        1
      )}% and hit the 15% bad luck threshold!`,
      `The market wasn't in your favor, reducing your purchase by ${(
        (1 - reduction) *
        100
      ).toFixed(1)}%\n`,
      `You spent ${formatCurrency(
        spendAmount
      )} but only received ${formatCurrency(
        actualSpendAmount
      )} worth of BIFFCOIN.`,
      `The house thanks you for your donation of ${formatCurrency(
        spendAmount - actualSpendAmount
      )}! 🎰`,
    ].join("\n");

    const biffcoinAmount = actualSpendAmount / data.price;
    wallet.biffcoin += biffcoinAmount;
    await data.save();

    await interaction.reply(message);
  } else {
    const biffcoinAmount = actualSpendAmount / data.price;
    wallet.biffcoin += biffcoinAmount;
    await data.save();

    await interaction.reply(
      `Bought ${formatBIFFCOIN(biffcoinAmount)} for ${formatCurrency(
        spendAmount
      )}`
    );
  }
};

const handleSell = async (interaction) => {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const amount = interaction.options.getNumber("amount");
  if (amount <= 0) {
    await interaction.reply("Amount must be positive!");
    return;
  }

  const wallet = data.wallets.get(userId);
  if (wallet.biffcoin < amount) {
    await interaction.reply("Insufficient BIFFCOIN!");
    return;
  }

  const cashValue = amount * data.price;
  wallet.biffcoin -= amount;
  wallet.cash += cashValue;
  await data.save();

  await interaction.reply(
    `Sold ${formatBIFFCOIN(amount)} for ${formatCurrency(cashValue)}`
  );
};

const handleSellAll = async (interaction) => {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const wallet = data.wallets.get(userId);
  if (wallet.biffcoin <= 0) {
    await interaction.reply("You don't have any BIFFCOIN to sell!");
    return;
  }

  const amount = wallet.biffcoin;
  const cashValue = amount * data.price;
  wallet.biffcoin = 0;
  wallet.cash += cashValue;
  await data.save();

  await interaction.reply(
    `Sold all your BIFFCOIN!\n` +
      `Amount: ${formatBIFFCOIN(amount)}\n` +
      `Received: ${formatCurrency(cashValue)}`
  );
};

const handleWallet = async (interaction) => {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const wallet = data.wallets.get(userId);
  const biffcoinValue = wallet.biffcoin * data.price;
  const totalValue = wallet.cash + biffcoinValue;

  await interaction.reply(
    `Wallet Balance:\n` +
      `Cash: ${formatCurrency(wallet.cash)}\n` +
      `BIFFCOIN: ${formatBIFFCOIN(wallet.biffcoin)} (Worth: ${formatCurrency(
        biffcoinValue
      )})\n` +
      `Total Value: ${formatCurrency(totalValue)}`
  );
};

const handlePrice = async (interaction) => {
  const currentTimeEST = getEasternTime();

  await interaction.reply(
    `📊 BIFFCOIN Market Update 📊\n\n` +
      `Current Price: ${formatCurrency(data.price)}\n` +
      `Last Change: ${(data.lastPriceChange * 100).toFixed(2)}%\n` + // Use the stored value
      `Previous Price: ${formatCurrency(previousPrice)}\n` +
      `Time (EST): ${currentTimeEST}\n\n` +
      `Price updates every minute automatically`
  );
};

const handleLeaderboard = async (interaction) => {
  const walletEntries = Array.from(data.wallets.entries()).map(
    ([userId, wallet]) => ({
      userId,
      totalValue: calculateWalletValue(wallet),
      wallet,
    })
  );

  walletEntries.sort((a, b) => b.totalValue - a.totalValue);

  const top10 = walletEntries.slice(0, 10);

  let leaderboardMsg = "🏆 BIFFCOIN Wealth Rankings 🏆\n\n";

  for (let i = 0; i < top10.length; i++) {
    const entry = top10[i];
    const user = await client.users.fetch(entry.userId);
    const username = user.username;

    leaderboardMsg += `${i + 1}. ${username}\n`;
    leaderboardMsg += `   💰 Total Value: ${formatCurrency(
      entry.totalValue
    )}\n`;
    leaderboardMsg += `   💵 Cash: ${formatCurrency(entry.wallet.cash)}\n`;
    leaderboardMsg += `   🪙 BIFFCOIN: ${formatBIFFCOIN(
      entry.wallet.biffcoin
    )}\n\n`;
  }

  leaderboardMsg += `\nCurrent BIFFCOIN Price: ${formatCurrency(data.price)}`;

  await interaction.reply(leaderboardMsg);
};

const handleBiffcoinExplain = async (interaction) => {
  const explanation = `
🪙 **Welcome to BIFFCOIN!** 🪙

BIFFCOIN is a simulated cryptocurrency trading game where you can earn, trade, and compete with other users. The price updates every minute with some randomization to simulate market volatility!

**Available Commands:**
• \`/register_wallet\` - Create your wallet with ${formatCurrency(
    INITIAL_BALANCE
  )} starting cash
• \`/work\` - Earn money once per day (EST timezone)
• \`/buy <amount>\` - Buy BIFFCOIN with specified cash amount
• \`/buy_all\` - Buy as much BIFFCOIN as possible with your available cash
• \`/sell <amount>\` - Sell specified amount of BIFFCOIN
• \`/sell_all\` - Sell all BIFFCOIN in your wallet
• \`/wallet\` - Check your current balance and holdings
• \`/price\` - See current BIFFCOIN price
• \`/leaderboard\` - View top 10 richest traders

**Market Manipulation Commands:**
• \`/spook\` - Once per day, attempt to scare the market
  - 1% chance of success
  - If successful, drops price by ${(SPOOK_CHANGE * 100).toFixed(0)}%
  - Failed attempts still count as your daily try
  - Resets at midnight EST
  
• \`/pump\` - Once per day, attempt to boost the market
  - 1% chance of success
  - If successful, increases price by ${(PUMP_CHANGE * 100).toFixed(0)}%
  - Failed attempts still count as your daily try
  - Resets at midnight EST

**Game Mechanics:**
• Prices update every minute
• Price updates are announced every 30 minutes in #bfcn
• Price changes follow a normal distribution with:
  - Mean change: 0.5%
  - Maximum change: ±60%
• When buying, there's a 15% chance of getting less than you paid for
• Daily work rewards use a log-normal distribution:
  - Most rewards around ${formatCurrency(0.1)}
  - Range from ${formatCurrency(0.0001)} to ${formatCurrency(100)}

Good luck trading! 📈
`;

  await interaction.reply(explanation);
};

const handleVersion = async (interaction) => {
  const versionMsg = [
    `🪙 **BIFFCOIN v${BIFFCOIN_VERSION}**`,
    "",
    "Latest Updates:",
    ...VERSION_NOTES.map((note) => note),
    "",
    `Current Price: ${formatCurrency(data.price)}`,
  ].join("\n");

  await interaction.reply(versionMsg);
};

const handleSpook = async (interaction) => {
  const userId = interaction.user.id;
  const currentDateEST = getEasternDateString();
  const lastSpookDate = data.lastSpook.get(userId);

  if (lastSpookDate === currentDateEST) {
    await interaction.reply(
      "You've already tried to spook the market today! Try again after midnight Eastern Time."
    );
    return;
  }

  // Record the attempt regardless of outcome
  data.lastSpook.set(userId, currentDateEST);
  await data.save();

  // 1% chance
  const roll = Math.random() * 100;
  if (roll <= 1) {
    previousPrice = data.price; // Store old price
    data.price *= 1 - SPOOK_CHANGE; // Use the constant for price change

    const message = [
      "👻 **MARKET SPOOKED!** 👻",
      `You rolled ${roll.toFixed(2)}% - Critical hit!`,
      "",
      `Previous Price: ${formatCurrency(previousPrice)}`,
      `New Price: ${formatCurrency(data.price)}`,
      `Change: -${(SPOOK_CHANGE * 100).toFixed(0)}%`, // Use the constant in message
      "",
      "The market trembles in fear...",
      "",
      "https://www.youtube.com/watch?v=WzAT-l1YnhI",
    ].join("\n");

    // Broadcast to all BFCN channels
    client.guilds.cache.forEach(async (guild) => {
      const bfcnChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText && channel.name === "bfcn"
      );
      if (bfcnChannel) {
        await bfcnChannel.send(message);
      }
    });

    await interaction.reply(message);
  } else {
    await interaction.reply(
      `You rolled ${roll.toFixed(
        2
      )}% - Need 1.00% or lower to spook the market by ${(
        SPOOK_CHANGE * 100
      ).toFixed(0)}%!\n` + `Try again tomorrow!`
    );
  }
};

const handlePump = async (interaction) => {
  const userId = interaction.user.id;
  const currentDateEST = getEasternDateString();
  const lastPumpDate = data.lastPump.get(userId);

  if (lastPumpDate === currentDateEST) {
    await interaction.reply(
      "You've already tried to pump the market today! Try again after midnight Eastern Time."
    );
    return;
  }

  // Record the attempt regardless of outcome
  data.lastPump.set(userId, currentDateEST);
  await data.save();

  // 1% chance
  const roll = Math.random() * 100;
  if (roll <= 1) {
    previousPrice = data.price; // Store old price
    data.price *= 1 + PUMP_CHANGE; // Use the constant for price change

    const message = [
      "🚀 **MARKET PUMPED!** 🚀",
      `You rolled ${roll.toFixed(2)}% - Critical hit!`,
      "",
      `Previous Price: ${formatCurrency(previousPrice)}`,
      `New Price: ${formatCurrency(data.price)}`,
      `Change: +${(PUMP_CHANGE * 100).toFixed(0)}%`, // Use the constant in message
      "",
      "To the moon! 🌕",
    ].join("\n");

    // Broadcast to all BFCN channels
    client.guilds.cache.forEach(async (guild) => {
      const bfcnChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText && channel.name === "bfcn"
      );
      if (bfcnChannel) {
        await bfcnChannel.send(message);
      }
    });

    await interaction.reply(message);
  } else {
    await interaction.reply(
      `You rolled ${roll.toFixed(
        2
      )}% - Need 1.00% or lower to pump the market by ${(
        PUMP_CHANGE * 100
      ).toFixed(0)}%!\n` + `Try again tomorrow!`
    );
  }
};

const handleBFCNChangeToday = async (interaction) => {
  // Check if we need to reset daily price
  data.checkDailyReset();

  const changeAmount = data.price - data.dailyStartPrice;
  const changePercent =
    ((data.price - data.dailyStartPrice) / data.dailyStartPrice) * 100;

  const changeEmoji = changePercent >= 0 ? "📈" : "📉";
  const colorEmoji = changePercent >= 0 ? "🟢" : "🔴";

  const message = [
    `${changeEmoji} **BIFFCOIN Daily Change Report** ${changeEmoji}`,
    "",
    `Start of Day (00:00 EST): ${formatCurrency(data.dailyStartPrice)}`,
    `Current Price: ${formatCurrency(data.price)}`,
    `Change: ${colorEmoji} ${
      changePercent >= 0 ? "+" : ""
    }${changePercent.toFixed(2)}%`,
    `Dollar Change: ${formatCurrency(changeAmount)}`,
    "",
    `Current Time (EST): ${getEasternTime()}`,
  ].join("\n");

  await interaction.reply(message);
};

// Event handlers
client.once("ready", async () => {
  console.log(`Bot is ready as ${client.user.tag}`);
  await data.load();

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("Slash commands registered");
  } catch (error) {
    console.error("Error registering slash commands:", error);
  }

  // Price update interval (every 1 minute)
  setInterval(async () => {
    const changePercent = updatePrice();
    console.log(
      `[${new Date().toISOString()}] Price updated: ${formatCurrency(
        data.price
      )} (${(changePercent * 100).toFixed(2)}% change)`
    );
    await data.save();
  }, PRICE_UPDATE_INTERVAL);

  // Price announcement interval (every 30 minutes)
  setInterval(async () => {
    // Find the BFCN channel in all guilds
    client.guilds.cache.forEach(async (guild) => {
      const bfcnChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText && channel.name === "bfcn"
      );

      if (bfcnChannel) {
        const currentTimeEST = getEasternTime();
        const lastChange = ((data.price - previousPrice) / previousPrice) * 100;

        await bfcnChannel.send(
          `📊 BIFFCOIN Market Update 📊\n\n` +
            `Previous Price: ${formatCurrency(previousPrice)}\n` +
            `Current Price: ${formatCurrency(data.price)}\n` +
            `Change: ${lastChange.toFixed(2)}%\n` +
            `Time (EST): ${currentTimeEST}\n\n` +
            `Next market update in 30 minutes`
        );
      }
    });
  }, PRICE_ANNOUNCE_INTERVAL);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "register_wallet":
        await handleRegisterWallet(interaction);
        break;
      case "work":
        await handleWork(interaction);
        break;
      case "buy":
        await handleBuy(interaction);
        break;
      case "buy_all":
        await handleBuyAll(interaction);
        break;
      case "sell":
        await handleSell(interaction);
        break;
      case "sell_all":
        await handleSellAll(interaction);
        break;
      case "wallet":
        await handleWallet(interaction);
        break;
      case "price":
        await handlePrice(interaction);
        break;
      case "leaderboard":
        await handleLeaderboard(interaction);
        break;
      case "biffcoin_explain":
        await handleBiffcoinExplain(interaction);
        break;
      case "version":
        await handleVersion(interaction);
        break;
      case "spook":
        await handleSpook(interaction);
        break;
      case "pump":
        await handlePump(interaction);
        break;
      case "bfcnchangetoday":
        await handleBFCNChangeToday(interaction);
        break;
    }
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
