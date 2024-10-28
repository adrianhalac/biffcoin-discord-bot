import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { getEasternTime } from "../../utils/time.js";

export const data = new SlashCommandBuilder()
  .setName("bfcnchangetoday")
  .setDescription("Show how much BIFFCOIN has changed since midnight EST");

export async function execute(interaction, data) {
  data.checkDailyReset();

  // Get price history to find earliest price if needed
  const history = await data.getPriceHistory();
  let startPrice = data.dailyStartPrice;
  let startTimeLabel = "Start of Day (00:00 EST)";

  // If we don't have data from midnight, use earliest available price
  if (history.length > 0 && startPrice === data.price) {
    startPrice = history[0].price;
    const startTime = new Date(history[0].timestamp);
    startTimeLabel = `Earliest Price (${startTime.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
      year: "numeric",
    })} ${startTime.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    })} EST)`;
  }

  const changeAmount = data.price - startPrice;
  const changePercent = ((data.price - startPrice) / startPrice) * 100;

  const changeEmoji = changePercent >= 0 ? "📈" : "📉";
  const colorEmoji = changePercent >= 0 ? "🟢" : "🔴";

  const message = [
    `${changeEmoji} **BIFFCOIN Daily Change Report** ${changeEmoji}`,
    "",
    `${startTimeLabel}: ${formatCurrency(startPrice)}`,
    `Current Price: ${formatCurrency(data.price)}`,
    `Change: ${colorEmoji} ${
      changePercent >= 0 ? "+" : ""
    }${changePercent.toFixed(2)}%`,
    `Dollar Change: ${formatCurrency(changeAmount)}`,
    "",
    `Current Time (EST): ${getEasternTime()}`,
  ].join("\n");

  await interaction.reply(message);
}
