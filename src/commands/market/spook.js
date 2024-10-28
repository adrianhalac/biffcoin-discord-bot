import { SlashCommandBuilder, ChannelType } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { getEasternDateString } from "../../utils/time.js";
import { SPOOK_CHANGE, SPOOK_SUCCESS_CHANCE } from "../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("spook")
  .setDescription(
    `Attempt to spook the market (${SPOOK_SUCCESS_CHANCE}% chance to drop price by ${(
      SPOOK_CHANGE * 100
    ).toFixed(0)}%)`
  );

export async function execute(interaction, data) {
  const userId = interaction.user.id;
  const currentDateEST = getEasternDateString();
  const lastSpookDate = data.lastSpook.get(userId);

  if (lastSpookDate === currentDateEST) {
    await interaction.reply(
      "You've already tried to spook the market today! Try again after midnight Eastern Time."
    );
    return;
  }

  data.lastSpook.set(userId, currentDateEST);
  await data.save();

  const roll = Math.random() * 100;
  if (roll <= SPOOK_SUCCESS_CHANCE) {
    const previousPrice = data.price;
    data.price *= 1 - SPOOK_CHANGE;

    const message = [
      "👻 **MARKET SPOOKED!** 👻",
      `You rolled ${roll.toFixed(2)}% - Critical hit!`,
      "",
      `Previous Price: ${formatCurrency(previousPrice)}`,
      `New Price: ${formatCurrency(data.price)}`,
      `Change: -${(SPOOK_CHANGE * 100).toFixed(0)}%`,
      "",
      "The market trembles in fear...",
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
      )}% - Need ${SPOOK_SUCCESS_CHANCE}% or lower to spook the market by ${(
        SPOOK_CHANGE * 100
      ).toFixed(0)}%!\n` + `Try again tomorrow!`
    );
  }
}
