export const getChangedKeys = (obj1, obj2) => {
  const changes = {};

  const compare = (key, value1, value2, parentKey = "") => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;

    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        changes[currentKey] = [value1, value2];
      }
    } else if (
      typeof value1 === "object" &&
      typeof value2 === "object" &&
      value1 !== null &&
      value2 !== null
    ) {
      const allKeys = new Set([...Object.keys(value1), ...Object.keys(value2)]);
      allKeys.forEach((nestedKey) => {
        compare(nestedKey, value1[nestedKey], value2[nestedKey], currentKey);
      });
    } else if (value1 !== value2) {
      changes[currentKey] = [value1, value2];
    }
  };

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  allKeys.forEach((key) => {
    compare(key, obj1[key], obj2[key]);
  });

  return changes;
};
