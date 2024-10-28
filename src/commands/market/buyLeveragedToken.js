import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("buy_leveraged")
  .setDescription("Buy leveraged BIFFCOIN tokens")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Type of leveraged token")
      .setRequired(true)
      .addChoices(
        { name: "7x BULL (7x Long)", value: "bull7" },
        { name: "5x BULL (5x Long)", value: "bull5" },
        { name: "3x BULL (3x Long)", value: "bull3" },
        { name: "3x BEAR (3x Short)", value: "bear3" },
        { name: "5x BEAR (5x Short)", value: "bear5" },
        { name: "7x BEAR (7x Short)", value: "bear7" }
      )
  )
  .addNumberOption((option) =>
    option
      .setName("amount")
      .setDescription("Dollar amount to spend (your cash: $X.XX)")
      .setRequired(true)
      .setMinValue(0.01)
  )
  .addStringOption((option) =>
    option
      .setName("duration")
      .setDescription("How long until auto-settlement")
      .setRequired(true)
      .addChoices(
        { name: "10 Minutes", value: "10" },
        { name: "30 Minutes", value: "30" },
        { name: "1 Hour", value: "60" }
      )
  );

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  const tokenType = interaction.options.getString("type");
  const amount = interaction.options.getNumber("amount");
  const duration = parseInt(interaction.options.getString("duration"));

  if (!data.wallets.has(userId)) {
    await interaction.reply("You need a wallet first! Use /register_wallet");
    return;
  }

  const wallet = data.wallets.get(userId);

  if (wallet.cash < amount) {
    await interaction.reply(
      `Insufficient funds! You have ${formatCurrency(
        wallet.cash
      )} available, ` + `but tried to spend ${formatCurrency(amount)}`
    );
    return;
  }

  // Get leverage and direction from token type
  const leverage = tokenType.includes("7")
    ? 7
    : tokenType.includes("5")
    ? 5
    : 3;
  const isLong = tokenType.includes("bull");

  // Create the leveraged token position
  const position = {
    type: tokenType,
    amount,
    leverage,
    isLong,
    initialPrice: data.price,
    timestamp: Date.now(),
    expiryTime: Date.now() + duration * 60 * 1000, // Convert minutes to milliseconds
  };

  // Store the position
  if (!data.leveragedPositions) {
    data.leveragedPositions = new Map();
  }
  if (!data.leveragedPositions.has(userId)) {
    data.leveragedPositions.set(userId, []);
  }
  data.leveragedPositions.get(userId).push(position);

  // Deduct the cost
  wallet.cash -= amount;
  await data.save();

  await interaction.reply(
    `🎯 Leveraged Token Purchased!\n` +
      `Type: ${isLong ? "🟢" : "🔴"} ${leverage}x ${
        isLong ? "BULL" : "BEAR"
      }\n` +
      `Amount Spent: ${formatCurrency(amount)}\n` +
      `Amount Controlled: ${formatCurrency(
        amount * leverage
      )} worth of BIFFCOIN\n` +
      `Entry Price: ${formatCurrency(data.price)}\n` +
      `Leverage Effect: 1% price ${
        isLong ? "increase" : "decrease"
      } = ${leverage}% profit\n` +
      `Cash Remaining: ${formatCurrency(wallet.cash)}\n` +
      `Duration: ${duration} minutes\n` +
      `Use /leveraged_positions to view your tokens`
  );
}
