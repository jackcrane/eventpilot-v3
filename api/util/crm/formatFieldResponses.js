const parseFieldValue = (raw) => {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const first = value[0];
  const last = value[value.length - 1];
  const couldBeJson =
    (first === "[" && last === "]") || (first === "{" && last === "}");
  if (couldBeJson) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (entry == null ? "" : String(entry)))
          .filter(Boolean)
          .join(", ");
      }
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed)
          .map((entry) => (entry == null ? "" : String(entry)))
          .filter(Boolean)
          .join(", ");
      }
    } catch (_) {
      void _;
      // swallow parse errors and fall back to raw string
    }
  }
  return value;
};

export const formatFieldResponses = (responses = []) =>
  responses
    .map((response) => {
      const label = response?.field?.label?.trim();
      const fieldId = response?.field?.id ?? response?.fieldId ?? null;
      const rawValue =
        response?.option?.label ??
        (response?.value != null ? String(response.value) : null);
      const value = parseFieldValue(rawValue);
      if (!fieldId || !label || !value) return null;
      return { fieldId, label, value };
    })
    .filter(Boolean);
