import { SlashCommandBuilder } from "discord.js";
import { BIFFCOIN_VERSION, VERSION_NOTES } from "../../utils/constants.js";
import { formatCurrency } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("version")
  .setDescription("Show current BIFFCOIN version and latest changes");

export async function execute(interaction, data) {
  const versionMsg = [
    `🪙 **BIFFCOIN v${BIFFCOIN_VERSION}**`,
    "",
    "Latest Updates:",
    ...VERSION_NOTES.map((note) => note),
    "",
    `Current Price: ${formatCurrency(data.price)}`,
  ].join("\n");

  await interaction.reply(versionMsg);
}
