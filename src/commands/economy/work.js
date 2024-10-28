import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { getEasternDateString, getEasternTime } from "../../utils/time.js";
import { generateWorkEarnings } from "../../utils/math.js";

export const data = new SlashCommandBuilder()
  .setName("work")
  .setDescription("Work to earn money (once per calendar day EST)");

export async function execute(interaction, data) {
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
}
