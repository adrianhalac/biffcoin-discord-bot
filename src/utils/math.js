export const generateWorkEarnings = () => {
  // Use log-normal distribution
  const mu = Math.log(0.1); // Center around $0.10
  const sigma = 1.2; // Slightly tighter spread

  // Generate earnings
  const earnings = Math.exp(mu + sigma * Math.random());

  // Clamp between $0.01 and $5.00
  return Math.max(0.01, Math.min(5.0, earnings));
};
