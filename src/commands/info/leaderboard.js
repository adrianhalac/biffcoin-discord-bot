import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the wealthiest BIFFCOIN holders");

export async function execute(interaction, data) {
  const wallets = Array.from(data.wallets.entries());
  const sortedWallets = wallets.sort((a, b) => {
    const leveragedValueA = calculateLeveragedValue(a[0], data);
    const totalValueA =
      a[1].biffcoin * data.price + a[1].cash + leveragedValueA;

    const leveragedValueB = calculateLeveragedValue(b[0], data);
    const totalValueB =
      b[1].biffcoin * data.price + b[1].cash + leveragedValueB;

    return totalValueB - totalValueA;
  });

  let leaderboardText = "💰 **Wealthiest BIFFCOIN Holders** 💰\n\n";

  // First three entries get their own lines with bold net worth
  for (let i = 0; i < Math.min(3, sortedWallets.length); i++) {
    const [userId, wallet] = sortedWallets[i];
    const leveragedValue = calculateLeveragedValue(userId, data);
    const totalValue =
      wallet.biffcoin * data.price + wallet.cash + leveragedValue;
    const member = await interaction.guild.members.fetch(userId);
    const displayName = member.displayName;
    const biffcoinValue = wallet.biffcoin * data.price;

    const rank = i === 0 ? "👑" : `#${i + 1}`;
    leaderboardText += `${rank} ${displayName}\n`;
    leaderboardText += `   📊 Net Worth: **${formatCurrency(totalValue)}**\n`;
    leaderboardText += `   🪙 BIFFCOIN: ${formatBIFFCOIN(
      wallet.biffcoin
    )} (worth ${formatCurrency(biffcoinValue)})\n`;
    leaderboardText += `   💵 Liquid Cash: ${formatCurrency(wallet.cash)}\n`;
    if (leveragedValue !== 0) {
      leaderboardText += `   📈 Leveraged Value: ${formatCurrency(
        leveragedValue
      )}\n`;
    }
    leaderboardText += "\n";
  }

  // Remaining entries are single line each, no bold, smaller text
  for (let i = 3; i < Math.min(sortedWallets.length, 10); i++) {
    const [userId, wallet] = sortedWallets[i];
    const leveragedValue = calculateLeveragedValue(userId, data);
    const totalValue =
      wallet.biffcoin * data.price + wallet.cash + leveragedValue;
    const member = await interaction.guild.members.fetch(userId);
    const displayName = member.displayName;
    const biffcoinValue = wallet.biffcoin * data.price;

    leaderboardText += `#${i + 1} ${displayName}`;
    leaderboardText += `\xa0\xa0\xa0\xa0`; // Using non-breaking spaces for padding
    leaderboardText += `📊 ${formatCurrency(totalValue)}  |  `;
    leaderboardText += `🪙 ${formatBIFFCOIN(wallet.biffcoin)} (${formatCurrency(
      biffcoinValue
    )})  |  `;
    leaderboardText += `💵 ${formatCurrency(wallet.cash)}`;
    if (leveragedValue !== 0) {
      leaderboardText += `  |  📈 ${formatCurrency(leveragedValue)}`;
    }
    leaderboardText += "\n";
  }

  await interaction.reply(leaderboardText);
}

// Helper function to calculate leveraged positions value
function calculateLeveragedValue(userId, data) {
  const positions = data.leveragedPositions?.get(userId) || [];
  let totalValue = 0;

  for (const position of positions) {
    const priceDiff = data.price - position.initialPrice;
    const percentChange = priceDiff / position.initialPrice;

    // Calculate P&L based on direction and leverage
    const value = position.isLong
      ? position.amount * (percentChange * position.leverage) // Long: profit when price up
      : position.amount * (-percentChange * position.leverage); // Short: profit when price down

    totalValue += position.amount + value;
  }

  return totalValue;
}
