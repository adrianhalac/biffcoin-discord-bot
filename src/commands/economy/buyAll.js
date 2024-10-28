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
