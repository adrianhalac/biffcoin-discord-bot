import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAPH_CACHE_DIR = path.join(__dirname, "..", "..", "..", "graph_cache");
const GRAPH_COOLDOWN = 30 * 60 * 1000; // 30 minutes

// Create a single ChartJSNodeCanvas instance at the top level
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 400,
  backgroundColour: "#2f3136",
  chartCallback: (ChartJS) => {
    ChartJS.defaults.color = "white";
    ChartJS.defaults.font.family = "Arial";
  },
});

// No need for Chart.js import or plugin registration
// chartjs-node-canvas handles this internally

export const data = new SlashCommandBuilder()
  .setName("graph")
  .setDescription("Generate a price graph")
  .addStringOption((option) =>
    option
      .setName("period")
      .setDescription("Time period for the graph")
      .setRequired(true)
      .addChoices(
        { name: "24 Hours", value: "24h" },
        { name: "Week", value: "week" },
        { name: "Month", value: "month" },
        { name: "Year", value: "year" },
        { name: "All Time", value: "all" }
      )
  );

export async function execute(
  interaction,
  data,
  directPeriod = null,
  isAnnouncement = false
) {
  if (!isAnnouncement) {
    await interaction.deferReply();
  }

  try {
    const period = directPeriod || interaction.options.getString("period");
    const history = await data.getPriceHistory();

    if (!history || history.length < 2) {
      await interaction.editReply(
        "📊 The bot hasn't collected enough price data yet. Please wait a few minutes for some price history to build up."
      );
      return;
    }

    const currentTime = Date.now();
    let filteredHistory;
    let periodLabel;

    switch (period) {
      case "24h":
        filteredHistory = history.filter(
          (entry) => entry.timestamp > currentTime - 24 * 60 * 60 * 1000
        );
        periodLabel = "24 Hours";
        break;
      case "week":
        filteredHistory = history.filter(
          (entry) => entry.timestamp > currentTime - 7 * 24 * 60 * 60 * 1000
        );
        periodLabel = "Week";
        break;
      case "month":
        filteredHistory = history.filter(
          (entry) => entry.timestamp > currentTime - 30 * 24 * 60 * 60 * 1000
        );
        periodLabel = "Month";
        break;
      case "year":
        filteredHistory = history.filter(
          (entry) => entry.timestamp > currentTime - 365 * 24 * 60 * 60 * 1000
        );
        periodLabel = "Year";
        break;
      case "all":
        filteredHistory = history;
        periodLabel = "All Time";
        break;
    }

    if (filteredHistory.length < 2) {
      const timeActive = Math.floor(
        (Date.now() - history[0].timestamp) / (60 * 60 * 1000)
      );
      await interaction.editReply(
        `📊 Not enough data for ${periodLabel} graph yet.\n` +
          `The bot has only been collecting prices for ${timeActive} hour${
            timeActive !== 1 ? "s" : ""
          }.\n` +
          `Try a shorter time period or wait for more data to accumulate.`
      );
      return;
    }

    const startPrice = filteredHistory[0].price;
    const endPrice = filteredHistory[filteredHistory.length - 1].price;
    const priceChange = ((endPrice - startPrice) / startPrice) * 100;
    const color = priceChange >= 0 ? "rgb(0, 255, 0)" : "rgb(255, 0, 0)";

    const width = 800;
    const height = 400;
    const configuration = {
      type: "line",
      data: {
        labels: filteredHistory.map((entry) =>
          new Date(entry.timestamp).toLocaleString("en-US", {
            timeZone: "America/New_York",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        ),
        datasets: [
          {
            label: "BIFFCOIN Price",
            data: filteredHistory.map((entry) => entry.price),
            borderColor: color,
            backgroundColor: color + "20",
            fill: true,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `BIFFCOIN Price (${periodLabel})`,
            color: "white",
            font: { size: 20 },
          },
          legend: { display: false },
          annotation: {
            annotations: {
              startLine: {
                type: "line",
                yMin: startPrice,
                yMax: startPrice,
                borderColor: "rgba(255, 255, 255, 0.5)",
                borderWidth: 1,
                borderDash: [5, 5],
                label: {
                  content: `Start: ${formatCurrency(startPrice)}`,
                  enabled: true,
                  position: "left",
                },
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            ticks: { color: "white", maxRotation: 45, minRotation: 45 },
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            ticks: {
              color: "white",
              callback: function (value) {
                return formatCurrency(value);
              },
            },
          },
        },
      },
    };

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    const changeEmoji = priceChange >= 0 ? "📈" : "📉";
    const changeColor = priceChange >= 0 ? "🟢" : "🔴";

    // Return image for announcements
    if (isAnnouncement) {
      return { image, priceChange };
    }

    // Normal command response
    await interaction.editReply({
      content: [
        `${changeEmoji} **BIFFCOIN ${periodLabel} Price Chart** ${changeEmoji}`,
        "",
        `Start Price: ${formatCurrency(startPrice)}`,
        `Current Price: ${formatCurrency(endPrice)}`,
        `Change: ${changeColor} ${
          priceChange >= 0 ? "+" : ""
        }${priceChange.toFixed(2)}%`,
      ].join("\n"),
      files: [{ attachment: image, name: "price_chart.png" }],
    });
  } catch (error) {
    console.error("Error generating graph:", error);
    if (!isAnnouncement) {
      await interaction.editReply(
        "An error occurred while generating the price chart."
      );
    }
    throw error;
  }
}
