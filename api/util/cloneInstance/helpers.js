// Helper utilities for cloneInstance

export const computeDeltaMs = (srcStart, dstStart, enable = true) =>
  enable ? new Date(dstStart).getTime() - new Date(srcStart).getTime() : 0;

export const shiftDate = (date, deltaMs) =>
  deltaMs ? new Date(new Date(date).getTime() + deltaMs) : date;

