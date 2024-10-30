import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("buy")
  .setDescription("Buy BIFFCOIN")
  .addNumberOption((option) =>
    option
      .setName("amount")
      .setDescription("Amount in dollars to spend")
      .setRequired(true)
  );

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  if (!data.wallets.has(userId)) {
    await interaction.reply(
      "You need to register a wallet first! Use /register_wallet"
    );
    return;
  }

  const spendAmount = interaction.options.getNumber("amount");
  if (spendAmount <= 0) {
    await interaction.reply("Amount must be positive!");
    return;
  }

  const wallet = data.wallets.get(userId);
  if (wallet.cash < spendAmount) {
    await interaction.reply("Insufficient funds!");
    return;
  }

  wallet.cash -= spendAmount;
  const biffcoinAmount = spendAmount / data.price;
  wallet.biffcoin += biffcoinAmount;
  await data.save();

  await interaction.reply(
    `Bought ${formatBIFFCOIN(biffcoinAmount)} for ${formatCurrency(
      spendAmount
    )}`
  );
}
