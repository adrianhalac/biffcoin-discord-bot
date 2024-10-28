import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("sell_all")
  .setDescription("Sell all your BIFFCOIN");

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply("You need a wallet first! Use /register_wallet");
    return;
  }

  const wallet = data.wallets.get(userId);
  if (wallet.biffcoin <= 0) {
    await interaction.reply(
      `You don't have any BIFFCOIN to sell!\n` +
        `Current balance: ${formatBIFFCOIN(0)}`
    );
    return;
  }

  const sellAmount = wallet.biffcoin;
  const cashAmount = sellAmount * data.price;
  wallet.biffcoin = 0;
  wallet.cash += cashAmount;
  await data.save();

  await interaction.reply(
    `Sold ${formatBIFFCOIN(sellAmount)} for ${formatCurrency(cashAmount)}\n` +
      `New cash balance: ${formatCurrency(wallet.cash)}`
  );
}
