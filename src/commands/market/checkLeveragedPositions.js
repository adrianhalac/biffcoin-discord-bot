import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("leveraged_positions")
  .setDescription("Check your active leveraged token positions");

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  const positions = data.leveragedPositions?.get(userId) || [];

  if (positions.length === 0) {
    await interaction.reply("You have no active leveraged positions!");
    return;
  }

  let msg = "🎯 Your Leveraged Positions:\n\n";

  positions.forEach((position, index) => {
    const timeLeft = position.expiryTime - Date.now();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));
    const minutesLeft = Math.max(0, Math.floor((timeLeft % 3600000) / 60000));

    // Calculate current P&L
    const priceDiff = data.price - position.initialPrice;
    const percentChange = priceDiff / position.initialPrice;
    const leveragedPercentChange = percentChange * position.leverage * 100;
    const value = position.isLong
      ? position.amount * (percentChange * position.leverage)
      : position.amount * (-percentChange * position.leverage);

    const profitLoss = value > 0 ? "📈 Profit" : "📉 Loss";
    const positionEmoji = position.isLong ? "🟢" : "🔴";

    msg += `#${index + 1}:\n`;
    msg += `Type: ${positionEmoji} ${position.leverage}x ${
      position.isLong ? "BULL" : "BEAR"
    }\n`;
    msg += `Amount Invested: ${formatCurrency(position.amount)}\n`;
    msg += `Entry Price: ${formatCurrency(position.initialPrice)}\n`;
    msg += `Current Price: ${formatCurrency(data.price)}\n`;
    msg += `Price Change: ${(percentChange * 100).toFixed(2)}%\n`;
    msg += `Leveraged Change: ${leveragedPercentChange.toFixed(2)}%\n`;
    msg += `${profitLoss}: ${formatCurrency(Math.abs(value))}\n`;
    msg += `Time Left: ${hoursLeft}h ${minutesLeft}m\n\n`;
  });

  await interaction.reply(msg);
}
