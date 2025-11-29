const NS_PER_MS = 1_000_000n;

export const createTimingTracker = (label) => {
  const start = process.hrtime.bigint();
  let last = start;
  return (step, extra = {}) => {
    const now = process.hrtime.bigint();
    const sinceLast = Number(now - last) / Number(NS_PER_MS);
    const total = Number(now - start) / Number(NS_PER_MS);
    last = now;
    const meta =
      extra && Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : "";
    console.log(
      `[${label}] ${step} +${sinceLast.toFixed(3)}ms (total ${total.toFixed(
        3
      )}ms)${meta}`
    );
  };
};
