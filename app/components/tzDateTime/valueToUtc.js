import data from "./tzs.json";

export const valueToUtc = (value) => {
  const tz = data.find((t) => t?.value?.toLowerCase() === value?.toLowerCase());
  // return tz;
  const vtr = tz?.utc?.[0];
  return vtr;
};

window.valueToUtc = valueToUtc;

export const utc = valueToUtc;
