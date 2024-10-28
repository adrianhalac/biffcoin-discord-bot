import { SlashCommandBuilder } from "discord.js";
import { formatCurrency } from "../../utils/formatters.js";
import {
  INITIAL_BALANCE,
  SPOOK_CHANGE,
  PUMP_CHANGE,
} from "../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("biffcoin_explain")
  .setDescription("Learn about BIFFCOIN and available commands");

export async function execute(interaction) {
  const explanation = `
🪙 **Welcome to BIFFCOIN!** 🪙

BIFFCOIN is a simulated cryptocurrency trading game where you can earn, trade, and compete with other users. The price updates every minute with some randomization to simulate market volatility!

**Available Commands:**
• \`/register_wallet\` - Create your wallet with ${formatCurrency(
    INITIAL_BALANCE
  )} starting cash
• \`/work\` - Earn money once per day (EST timezone)
• \`/buy <amount>\` - Buy BIFFCOIN with specified cash amount
• \`/buy_all\` - Buy as much BIFFCOIN as possible with your available cash
• \`/sell <amount>\` - Sell specified amount of BIFFCOIN
• \`/sell_all\` - Sell all BIFFCOIN in your wallet
• \`/wallet\` - Check your current balance and holdings
• \`/price\` - See current BIFFCOIN price
• \`/leaderboard\` - View top 10 richest traders
• \`/graph <period>\` - View price charts for different time periods

**Market Manipulation Commands:**
• \`/spook\` - Once per day, attempt to scare the market
  - 1% chance of success
  - If successful, drops price by ${(SPOOK_CHANGE * 100).toFixed(0)}%
  - Failed attempts still count as your daily try
  - Resets at midnight EST
  
• \`/pump\` - Once per day, attempt to boost the market
  - 1% chance of success
  - If successful, increases price by ${(PUMP_CHANGE * 100).toFixed(0)}%
  - Failed attempts still count as your daily try
  - Resets at midnight EST

**Game Mechanics:**
• Prices update every minute
• Price updates are announced every 30 minutes in #bfcn
• Price changes follow a normal distribution with:
  - Mean change: 0.5%
  - Maximum change: ±60%
• When buying, there's a 15% chance of getting less than you paid for
• Daily work rewards use a log-normal distribution:
  - Most rewards around ${formatCurrency(0.1)}
  - Range from ${formatCurrency(0.0001)} to ${formatCurrency(100)}

Good luck trading! 📈
`;

  await interaction.reply(explanation);
}
