import { SlashCommandBuilder, ChannelType } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { getEasternDateString } from "../../utils/time.js";
import { PUMP_CHANGE, PUMP_SUCCESS_CHANCE } from "../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("pump")
  .setDescription(
    `Attempt to pump the market (${PUMP_SUCCESS_CHANCE}% chance to increase price by ${(
      PUMP_CHANGE * 100
    ).toFixed(0)}%)`
  );

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  const currentDateEST = getEasternDateString();
  const lastPumpDate = data.lastPump.get(userId);

  if (lastPumpDate === currentDateEST) {
    await interaction.reply(
      "You've already tried to pump the market today! Try again after midnight Eastern Time."
    );
    return;
  }

  data.lastPump.set(userId, currentDateEST);
  await data.save();

  const roll = Math.random() * 100;
  if (roll <= PUMP_SUCCESS_CHANCE) {
    const previousPrice = data.price;
    data.price *= 1 + PUMP_CHANGE;

    const message = [
      "🚀 **MARKET PUMPED!** 🚀",
      `You rolled ${roll.toFixed(2)}% - Critical hit!`,
      "",
      `Previous Price: ${formatCurrency(previousPrice)}`,
      `New Price: ${formatCurrency(data.price)}`,
      `Change: +${(PUMP_CHANGE * 100).toFixed(0)}%`,
      "",
      "To the moon! 🌕",
      "",
      "https://www.youtube.com/watch?v=WzAT-l1YnhI",
    ].join("\n");

    // Broadcast to all BFCN channels
    interaction.client.guilds.cache.forEach(async (guild) => {
      const bfcnChannel = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText && channel.name === "bfcn"
      );
      if (bfcnChannel) {
        await bfcnChannel.send(message);
      }
    });

    await interaction.reply(message);
  } else {
    await interaction.reply(
      `You rolled ${roll.toFixed(
        2
      )}% - Need ${PUMP_SUCCESS_CHANCE}% or lower to pump the market by ${(
        PUMP_CHANGE * 100
      ).toFixed(0)}%!\n` + `Try again tomorrow!`
    );
  }
}
