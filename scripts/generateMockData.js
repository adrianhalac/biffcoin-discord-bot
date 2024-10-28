import fs from "fs";

const now = Date.now();
const data = [];

// Generate 48 hours of data, one entry per hour
for (let i = 48; i >= 0; i--) {
  const timestamp = now - i * 60 * 60 * 1000;
  // Add some random fluctuation around the trend
  const basePrice = 0.00099 + (0.00003 * (48 - i)) / 48;
  const randomFactor = 1 + (Math.random() * 0.0002 - 0.0001);
  const price = basePrice * randomFactor;

  data.push({
    timestamp,
    price,
  });
}

fs.writeFileSync("data/price_history_2024.json", JSON.stringify(data, null, 2));
