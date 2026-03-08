import { formatWithOptions } from "node:util";

const isTruthy = (value) => {
  if (value == null) return false;
  return ["1", "true", "yes", "on"].includes(
    String(value).toLowerCase().trim()
  );
};

export const isE2E = () =>
  isTruthy(process.env.E2E) || isTruthy(process.env.CYPRESS);

export const e2eLog = (message, context) => {
  if (!isE2E()) return;

  if (context !== undefined) {
    process.stdout.write(
      `${formatWithOptions({ colors: false, depth: 6 }, "[E2E] %s %O\n", message, context)}`
    );
    return;
  }

  process.stdout.write(`[E2E] ${message}\n`);
};

export default e2eLog;
