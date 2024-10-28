export const getEasternTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
};

export const getEasternDateString = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
