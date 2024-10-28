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
  let actualSpendAmount = spendAmount;
  const badLuckRoll = Math.random();

  if (badLuckRoll < 0.15) {
    const reduction = Math.random() * 0.9 + 0.1;
    actualSpendAmount *= reduction;

    const message = [
      `📉 Uh oh! You rolled ${(badLuckRoll * 100).toFixed(
        1
      )}% and hit the 15% bad luck threshold!`,
      `The market wasn't in your favor, reducing your purchase by ${(
        (1 - reduction) *
        100
      ).toFixed(1)}%\n`,
      `You spent ${formatCurrency(
        spendAmount
      )} but only received ${formatCurrency(
        actualSpendAmount
      )} worth of BIFFCOIN.`,
      `The house thanks you for your donation of ${formatCurrency(
        spendAmount - actualSpendAmount
      )}! 🎰`,
    ].join("\n");

    const biffcoinAmount = actualSpendAmount / data.price;
    wallet.biffcoin += biffcoinAmount;
    await data.save();

    await interaction.reply(message);
  } else {
    const biffcoinAmount = actualSpendAmount / data.price;
    wallet.biffcoin += biffcoinAmount;
    await data.save();

    await interaction.reply(
      `Bought ${formatBIFFCOIN(biffcoinAmount)} for ${formatCurrency(
        spendAmount
      )}`
    );
  }
}
