# 🪙 BIFFCOIN Discord Bot

> _The most fun you can have losing fake money!_ 🎰

A cryptocurrency simulation bot for Discord that lets users trade a fictional currency called BIFFCOIN (BFCN). Watch the markets, time your trades, and try not to get rekt! 📈📉

## ⭐ Features

- 🕒 Real-time price updates every minute
- 💼 Daily work rewards
- 📊 Buy/sell trading functionality
- 🎲 Market manipulation mechanics
- 💰 Persistent wallet system
- 🏆 Leaderboard tracking
- 📢 Price announcements in dedicated channel

## 🎮 Commands

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `/register_wallet`  | Create new wallet with initial balance 🆕         |
| `/work`             | Earn daily rewards (EST timezone) 💪              |
| `/buy <amount>`     | Buy BIFFCOIN 📈                                   |
| `/buy_all`          | Buy maximum possible BIFFCOIN 🔄                  |
| `/sell <amount>`    | Sell BIFFCOIN 📉                                  |
| `/sell_all`         | Sell all BIFFCOIN                                 |
| `/future`           | Buy futures contract (long/short) 🔮              |
| `/check_futures`    | View your active futures 📋                       |
| `/wallet`           | Check balance 👛                                  |
| `/price`            | Check current price 💹                            |
| `/leaderboard`      | View richest traders 👑                           |
| `/spook`            | Try to crash the market (1% chance) 👻            |
| `/pump`             | Try to pump the market (1% chance) 🚀             |
| `/version`          | Check bot version ℹ️                              |
| `/biffcoin_explain` | View detailed help ❓                             |
| `/graph <period>`   | Generate price graph (24h/week/month/year/all) 📈 |

## 🚀 Setup

1. Install dependencies:

```bash
npm install  # Get ready for liftoff! 🛸
```

2. Create a `.env` file with your Discord bot token:

```env
DISCORD_TOKEN=your_super_secret_token_here  # Keep it safe! 🔒
```

3. Create a Discord application and bot at [Discord Developer Portal](https://discord.com/developers/applications) 🤖

4. Required bot permissions:

- ✉️ Send Messages
- 💬 Use Slash Commands
- 👀 View Channels
- 📜 Read Message History

5. Launch the bot:

```bash
node index.js  # To the moon! 🌕
```

## 📝 Channel Setup

Create a text channel named `bfcn` for price announcements. This is where the magic happens! ✨

## 🎲 Game Mechanics

- 🔄 Prices update every minute using normal distribution
- 📊 Mean price change: 0.5%
- 📈 Maximum price change: ±60%
- 💰 Work rewards use log-normal distribution
- 🎲 15% chance of reduced purchase amounts
- ⏰ Daily cooldown on work/spook/pump commands (EST timezone)
- 🎯 Market manipulation has 1% success rate

## 💾 Data Persistence

The bot uses a JSON file (`biffcoin_data.json`) to store:

- 👛 User wallets
- 💹 Current price
- ⏱️ Work timestamps
- 📊 Market manipulation attempts

## 🚀 Deployment

For 24/7 operation, deploy to a server rather than running locally.

Recommended platforms:

- ☁️ Heroku
- 🌊 DigitalOcean
- 🌩️ AWS
- 🎯 Google Cloud
- 🖥️ VPS

## 📜 Version History

### v2.3 🎲

- Configurable market manipulation rates
- Multiple leveraged token durations
- Enhanced P&L calculations
- Improved position displays
- Better error handling
- Cleaner code organization

### v2.2 🎯

- Added Leveraged Token system
- 3x, 5x, and 7x leverage options
- BULL and BEAR tokens
- Auto-settlement system
- Clear profit/loss tracking

### v2.1 🎯

- Improved price history tracking
- Better start price calculations
- Cleaner number formatting
- Hourly price announcements
- Enhanced error handling
- Better data organization
- Improved visual displays

### v2.0 🔮

- Added Futures Trading system
- Long and Short positions
- 1-hour contracts with 10% upfront
- Auto-execution at expiry
- Enhanced price history storage
- Improved data organization
- Better number formatting

### v1.6 📈

- Added interactive price history graphs
- View charts for different time periods (24h to all-time)
- Automatic 24h graphs with price updates
- Dark mode Robinhood-style design
- Improved price update system
- Enhanced data persistence

### v1.5 📊

- Added /bfcnchangetoday command
- Shows price change since midnight EST
- Displays percentage and dollar change
- Tracks daily starting price
- Automatic midnight reset

### v1.3 🎉

- Improved price display precision
- Persistent price history
- Enhanced number formatting
- Added spooky video to market spooks
- Fixed price command
- Removed artificial price floor

### v1.2 🚀

- Added spook/pump commands
- Market manipulation mechanics
- Daily attempt tracking

### v1.1 🌟

- Initial release
- Basic trading functionality
- Work system
- Price updates

## ⚖️ License

MIT License - Go wild! 🎨

---

> _"Sir, this is a Discord bot"_ 🎰

Made with 💖 and probably too many emojis

**Remember:** Past performance does not guarantee future returns. Not financial advice. DYOR. To the moon! 🚀
