const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
const isArray = Array.isArray;

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((el, i) => deepEqual(el, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
};

const IGNORED_KEYS = new Set(["updatedAt"]);

export const diffObjects = (log) => {
  const data = log.data;
  if (!data) return log;
  if (!data.before || !data.after) return log;

  const { before, after } = data;
  const changes = [];

  const walk = (orig, upd, path = []) => {
    const keys = new Set([
      ...Object.keys(orig || {}),
      ...Object.keys(upd || {}),
    ]);

    for (const key of keys) {
      if (IGNORED_KEYS.has(key)) continue;

      const currentPath = [...path, key];
      const pathStr = currentPath.join(".");

      const oVal = orig?.[key];
      const uVal = upd?.[key];

      const bothAreObjects = isObject(oVal) && isObject(uVal);

      if (bothAreObjects) {
        walk(oVal, uVal, currentPath);
      } else if (!deepEqual(oVal, uVal)) {
        changes.push({
          path: pathStr,
          from: oVal,
          to: uVal,
        });
      }
    }
  };

  walk(before, after);
  return { ...log, changes };
};
