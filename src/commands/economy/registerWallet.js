import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { INITIAL_BALANCE } from "../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("register_wallet")
  .setDescription("Register a new BIFFCOIN wallet");

export async function execute(interaction, data) {
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
}
