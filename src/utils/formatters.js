export const formatCurrency = (amount) => {
  // For very small numbers (like prices), show fixed decimal places
  if (amount < 0.01) {
    // Show 8 decimal places but trim trailing zeros
    return `$${amount
      .toFixed(8)
      .replace(/\.?0+$/, "")
      .replace(/(\.\d*[1-9])0+$/, "$1")}`;
  }

  // For regular numbers, show 2 decimal places and add commas
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatBIFFCOIN = (amount) => {
  // Round to 2 decimal places and add commas for thousands
  const formattedNum = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formattedNum} BFCN`;
};
