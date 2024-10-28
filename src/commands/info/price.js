import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { getEasternTime } from "../../utils/time.js";

export const data = new SlashCommandBuilder()
  .setName("price")
  .setDescription("Check current BIFFCOIN price");

export async function execute(interaction, data) {
  const currentTimeEST = getEasternTime();

  await interaction.reply(
    `📊 BIFFCOIN Market Update 📊\n\n` +
      `Current Price: ${formatCurrency(data.price)}\n` +
      `Last Change: ${(data.lastPriceChange * 100).toFixed(2)}%\n` +
      `Time (EST): ${currentTimeEST}\n\n` +
      `Price updates every minute automatically`
  );
}
