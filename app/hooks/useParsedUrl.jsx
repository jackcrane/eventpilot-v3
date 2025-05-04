import { useMemo } from "react";

const CUID_REGEX = /^c[0-9a-z]{8}[0-9a-z]{4}[0-9a-z]{4}[0-9a-z]{8}$/;

export const useParsedUrl = (url) =>
  useMemo(() => {
    const tokens = url.split("/").filter(Boolean);
    const result = {};
    let i = 0;

    while (i < tokens.length) {
      const key = tokens[i];
      const next = tokens[i + 1];

      if (next && CUID_REGEX.test(next)) {
        result[key] = next;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    }

    return result;
  }, [url]);
