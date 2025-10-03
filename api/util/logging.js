import { prisma } from "#prisma";

const DEFAULT_CHUNK_SIZE = 50;

const chunkEntries = (entries, size) => {
  if (size <= 0) {
    return [entries.slice()];
  }

  const result = [];
  for (let i = 0; i < entries.length; i += size) {
    result.push(entries.slice(i, i + size));
  }
  return result;
};

export const createLogBuffer = ({
  client = prisma,
  chunkSize = DEFAULT_CHUNK_SIZE,
} = {}) => {
  const buffer = [];

  return {
    push(entry) {
      if (!entry) return;
      buffer.push(entry);
    },
    pushMany(entries = []) {
      for (const entry of entries) {
        if (entry) {
          buffer.push(entry);
        }
      }
    },
    get size() {
      return buffer.length;
    },
    clear() {
      buffer.length = 0;
    },
    async flush({ client: overrideClient } = {}) {
      if (!buffer.length) return;

      const target = overrideClient || client;
      const pending = buffer.splice(0, buffer.length);

      try {
        for (const batch of chunkEntries(pending, chunkSize)) {
          await target.logs.createMany({ data: batch });
        }
      } catch (error) {
        buffer.unshift(...pending);
        throw error;
      }
    },
  };
};

export default createLogBuffer;
