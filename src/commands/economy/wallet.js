import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("wallet")
  .setDescription("Check your BIFFCOIN wallet balance");

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const wallet = data.wallets.get(userId);
  const biffcoinValue = wallet.biffcoin * data.price;
  const positionsValue = data.calculatePositionsValue(userId);
  const totalValue = wallet.cash + biffcoinValue + positionsValue;

  const message = [
    "👛 **Your BIFFCOIN Wallet** 👛\n",
    `💵 Cash: ${formatCurrency(wallet.cash)}`,
    `🪙 BIFFCOIN: ${formatBIFFCOIN(wallet.biffcoin)} (worth ${formatCurrency(
      biffcoinValue
    )})`,
    positionsValue > 0
      ? `🎯 Positions Value: ${formatCurrency(positionsValue)}`
      : null,
    `💰 Total Value: ${formatCurrency(totalValue)}\n`,
    `Current BIFFCOIN Price: ${formatCurrency(data.price)}`,
  ]
    .filter(Boolean)
    .join("\n");

  await interaction.reply(message);
}
