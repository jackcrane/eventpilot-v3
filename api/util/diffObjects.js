export const isObject = (val) =>
  val != null && typeof val === "object" && !Array.isArray(val);

export const isArray = Array.isArray;

export const deepEqual = (a, b) => {
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

// remove every updatedAt in any nested object/array
export const stripUpdatedAt = (val) => {
  if (isArray(val)) {
    return val.map(stripUpdatedAt);
  }
  if (isObject(val)) {
    return Object.entries(val).reduce((acc, [k, v]) => {
      if (k === "updatedAt") return acc;
      acc[k] = stripUpdatedAt(v);
      return acc;
    }, {});
  }
  return val;
};

// custom stringify handlers for known array-fields
const arrayHandlers = {
  emails: (arr) => arr.map((e) => e.email).join(", "),
  phones: (arr) => arr.map((p) => p.phone).join(", "),
};

export const diffObjects = (log) => {
  const data = log.data;
  if (!data || !data.before || !data.after) return log;

  const beforeSanitized = stripUpdatedAt(data.before);
  const afterSanitized = stripUpdatedAt(data.after);
  const changes = [];

  const walk = (orig, upd, path = []) => {
    const keys = new Set([
      ...Object.keys(orig || {}),
      ...Object.keys(upd || {}),
    ]);

    for (const key of keys) {
      const currentPath = [...path, key];
      const pathStr = currentPath.join(".");

      const oVal = orig?.[key];
      const uVal = upd?.[key];

      // arrays first
      if (isArray(oVal) || isArray(uVal)) {
        if (arrayHandlers[key]) {
          const from = oVal ? arrayHandlers[key](oVal) : "";
          const to = uVal ? arrayHandlers[key](uVal) : "";
          if (from !== to) changes.push({ path: pathStr, from, to });
        } else if (!deepEqual(oVal, uVal)) {
          changes.push({
            path: pathStr,
            from: JSON.stringify(oVal),
            to: JSON.stringify(uVal),
          });
        }
        continue;
      }

      // nested objects
      if (isObject(oVal) && isObject(uVal)) {
        walk(oVal, uVal, currentPath);
      }
      // primitives or mismatches
      else if (!deepEqual(oVal, uVal)) {
        changes.push({ path: pathStr, from: oVal, to: uVal });
      }
    }
  };

  walk(beforeSanitized, afterSanitized);
  return { ...log, changes };
};
