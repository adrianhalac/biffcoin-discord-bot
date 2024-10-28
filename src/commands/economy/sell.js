import { SlashCommandBuilder } from "discord.js";
import { formatCurrency, formatBIFFCOIN } from "../../utils/formatters.js";

export const data = new SlashCommandBuilder()
  .setName("sell")
  .setDescription("Sell BIFFCOIN");

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

  // Show modal to input amount with shorter label
  await interaction.showModal({
    title: "Sell BIFFCOIN",
    custom_id: "sell_modal",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "sell_amount",
            label: `Amount to sell (max: ${wallet.biffcoin.toFixed(2)})`,
            style: 1,
            min_length: 1,
            max_length: 20,
            placeholder: `Available: ${formatBIFFCOIN(
              wallet.biffcoin
            )} (${formatCurrency(wallet.biffcoin * data.price)})`,
            required: true,
          },
        ],
      },
    ],
  });

  try {
    const modalResponse = await interaction.awaitModalSubmit({ time: 60000 });
    const sellAmount = parseFloat(
      modalResponse.fields.getTextInputValue("sell_amount")
    );

    if (isNaN(sellAmount) || sellAmount <= 0) {
      await modalResponse.reply("Please enter a valid positive number!");
      return;
    }

    if (sellAmount > wallet.biffcoin) {
      await modalResponse.reply(
        `Insufficient BIFFCOIN!\n` +
          `You have: ${formatBIFFCOIN(wallet.biffcoin)} (worth ${formatCurrency(
            wallet.biffcoin * data.price
          )})\n` +
          `Trying to sell: ${formatBIFFCOIN(
            sellAmount
          )} (worth ${formatCurrency(sellAmount * data.price)})\n` +
          `Missing: ${formatBIFFCOIN(sellAmount - wallet.biffcoin)}`
      );
      return;
    }

    const cashAmount = sellAmount * data.price;
    wallet.biffcoin -= sellAmount;
    wallet.cash += cashAmount;
    await data.save();

    await modalResponse.reply(
      `Sold ${formatBIFFCOIN(sellAmount)} for ${formatCurrency(cashAmount)}\n` +
        `Remaining BIFFCOIN: ${formatBIFFCOIN(
          wallet.biffcoin
        )} (worth ${formatCurrency(wallet.biffcoin * data.price)})`
    );
  } catch (error) {
    console.error("Error in sell modal:", error);
    await interaction.followUp({
      content: "Sale cancelled (timeout or error).",
      ephemeral: true,
    });
  }
}
