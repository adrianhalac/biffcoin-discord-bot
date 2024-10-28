import { promises as fs } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { INITIAL_PRICE } from "../utils/constants.js";
import { getEasternDateString } from "../utils/time.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "..", "data", "biffcoin_data.json");

// Change price history file to include year
function getPriceHistoryPath(year = new Date().getFullYear()) {
  return join(__dirname, "..", "..", "data", `price_history_${year}.json`);
}

export class BIFFCOINData {
  constructor() {
    this.price = INITIAL_PRICE;
    this.wallets = new Map();
    this.lastWork = new Map();
    this.lastSpook = new Map();
    this.lastPump = new Map();
    this.lastPriceChange = 0;
    this.dailyStartPrice = INITIAL_PRICE;
    this.lastResetDate = getEasternDateString();
    this.leveragedPositions = new Map();
  }

  async save() {
    const data = {
      price: this.price,
      wallets: Object.fromEntries(this.wallets),
      lastWork: Object.fromEntries(this.lastWork),
      lastSpook: Object.fromEntries(this.lastSpook),
      lastPump: Object.fromEntries(this.lastPump),
      lastPriceChange: this.lastPriceChange,
      dailyStartPrice: this.dailyStartPrice,
      lastResetDate: this.lastResetDate,
      leveragedPositions: Object.fromEntries(this.leveragedPositions),
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  }

  async load() {
    try {
      const fileContent = await fs.readFile(DATA_FILE, "utf-8");
      const data = JSON.parse(fileContent);
      this.price = data.price;
      this.wallets = new Map(Object.entries(data.wallets));
      this.lastWork = new Map(Object.entries(data.lastWork));
      this.lastSpook = new Map(Object.entries(data.lastSpook || {}));
      this.lastPump = new Map(Object.entries(data.lastPump || {}));
      this.lastPriceChange = data.lastPriceChange || 0;

      // Get the earliest price from history for today's start if needed
      const history = await this.getPriceHistory();
      if (history.length > 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayHistory = history.filter(
          (entry) => entry.timestamp >= todayStart.getTime()
        );
        this.dailyStartPrice =
          todayHistory.length > 0 ? todayHistory[0].price : history[0].price;
      } else {
        this.dailyStartPrice = data.dailyStartPrice || this.price;
      }

      this.lastResetDate = data.lastResetDate || getEasternDateString();
      this.leveragedPositions = new Map(
        Object.entries(data.leveragedPositions || {})
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Error loading data:", error);
      }
    }
  }

  async checkDailyReset() {
    const currentDateEST = getEasternDateString();
    if (currentDateEST !== this.lastResetDate) {
      // Get current price history for the day
      const history = await this.getPriceHistory();
      if (history.length > 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayHistory = history.filter(
          (entry) => entry.timestamp >= todayStart.getTime()
        );
        this.dailyStartPrice =
          todayHistory.length > 0 ? todayHistory[0].price : history[0].price;
      } else {
        this.dailyStartPrice = this.price;
      }
      this.lastResetDate = currentDateEST;
      await this.save();
    }
  }

  // New methods for price history
  async savePriceHistory() {
    try {
      const currentYear = new Date().getFullYear();
      const historyPath = getPriceHistoryPath(currentYear);
      let history = [];

      try {
        const fileContent = await fs.readFile(historyPath, "utf-8");
        history = JSON.parse(fileContent);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Error reading price history:", error);
        }
      }

      history.push({
        timestamp: Date.now(),
        price: this.price,
      });

      await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error("Error saving price history:", error);
    }
  }

  async getPriceHistory(period = "all") {
    try {
      const currentYear = new Date().getFullYear();
      let history = [];

      if (period === "all" || period === "year") {
        // Just load current year
        const currentYearPath = getPriceHistoryPath(currentYear);
        try {
          const fileContent = await fs.readFile(currentYearPath, "utf-8");
          history = JSON.parse(fileContent);
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error("Error reading price history:", error);
          }
        }
      } else {
        // For shorter periods, we might need to load previous year
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const previousYear = new Date(oneDayAgo).getFullYear();

        if (previousYear !== currentYear) {
          // Load both years and concatenate
          const previousYearPath = getPriceHistoryPath(previousYear);
          try {
            const previousContent = await fs.readFile(
              previousYearPath,
              "utf-8"
            );
            history = JSON.parse(previousContent);
          } catch (error) {
            if (error.code !== "ENOENT") {
              console.error(
                "Error reading previous year price history:",
                error
              );
            }
          }
        }

        // Add current year data
        const currentYearPath = getPriceHistoryPath(currentYear);
        try {
          const currentContent = await fs.readFile(currentYearPath, "utf-8");
          history = history.concat(JSON.parse(currentContent));
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error("Error reading current year price history:", error);
          }
        }
      }

      return history;
    } catch (error) {
      console.error("Error getting price history:", error);
      return [];
    }
  }

  // Helper method to ensure data directory exists
  async ensureDataDirectory() {
    try {
      const dataDir = dirname(DATA_FILE);
      await fs.mkdir(dataDir, { recursive: true });

      // Initialize price history with current price if no file exists
      const currentYearPath = getPriceHistoryPath();
      try {
        await fs.access(currentYearPath);
      } catch {
        await this.savePriceHistory();
      }
    } catch (error) {
      if (error.code !== "EEXIST") {
        console.error("Error creating data directory:", error);
      }
    }
  }

  // Add this method
  calculatePositionsValue(userId) {
    let totalValue = 0;
    const positions = this.leveragedPositions.get(userId) || [];

    positions.forEach((position) => {
      const priceDiff = this.price - position.initialPrice;
      const percentChange = priceDiff / position.initialPrice;
      const value = position.isLong
        ? position.amount * (percentChange * position.leverage)
        : position.amount * (-percentChange * position.leverage);

      totalValue += position.amount + value; // Initial amount plus profit/loss
    });

    return totalValue;
  }
}
