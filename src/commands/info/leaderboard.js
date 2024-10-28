import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Show the richest BIFFCOIN traders");

export async function execute(interaction, data) {
  const walletEntries = Array.from(data.wallets.entries()).map(
    ([userId, wallet]) => {
      const positionsValue = data.calculatePositionsValue(userId);
      return {
        userId,
        totalValue: wallet.cash + wallet.biffcoin * data.price + positionsValue,
        wallet,
        positionsValue,
      };
    }
  );

  walletEntries.sort((a, b) => b.totalValue - a.totalValue);
  const top10 = walletEntries.slice(0, 10);
  let leaderboardMsg = "🏆 BIFFCOIN Wealth Rankings 🏆\n\n";

  for (let i = 0; i < top10.length; i++) {
    const entry = top10[i];
    let username;
    try {
      const user = await interaction.client.users.fetch(entry.userId);
      username = user.username;
    } catch (error) {
      console.error(`Error fetching user ${entry.userId}:`, error);
      username = "Unknown User";
    }

    leaderboardMsg += `${i + 1}. ${username}\n`;
    leaderboardMsg += `   💰 Total Value: ${formatCurrency(
      entry.totalValue
    )}\n`;
    leaderboardMsg += `   💵 Cash: ${formatCurrency(entry.wallet.cash)}\n`;
    leaderboardMsg += `   🪙 BIFFCOIN: ${formatBIFFCOIN(
      entry.wallet.biffcoin
    )} (worth ${formatCurrency(entry.wallet.biffcoin * data.price)})\n`;
    if (entry.positionsValue > 0) {
      leaderboardMsg += `   🎯 Positions Value: ${formatCurrency(
        entry.positionsValue
      )}\n`;
    }
    leaderboardMsg += "\n";
  }

  leaderboardMsg += `\nCurrent BIFFCOIN Price: ${formatCurrency(data.price)}`;
  await interaction.reply(leaderboardMsg);
}
