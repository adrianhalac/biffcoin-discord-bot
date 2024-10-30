export const formatCurrency = (amount) => {
  if (amount >= 100) {
    // 123.45
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } else if (amount >= 1) {
    // 1.235
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })}`;
  } else if (amount >= 0.1) {
    // 0.2356
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })}`;
  } else if (amount >= 0.01) {
    // 0.04324
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    })}`;
  } else {
    // 0.001948
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    })}`;
  }
};

export const formatBIFFCOIN = (amount) => {
  // Round to 2 decimal places and add commas for thousands
  const formattedNum = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formattedNum} BFCN`;
};
