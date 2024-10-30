import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("buy_all")
  .setDescription("Buy as much BIFFCOIN as possible with available funds");

export async function execute(interaction, data) {
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

  const biffcoinAmount = spendAmount / data.price;
  wallet.biffcoin += biffcoinAmount;
  await data.save();

  await interaction.reply(
    `Bought ${formatBIFFCOIN(biffcoinAmount)} for ${formatCurrency(
      spendAmount
    )}`
  );
}
