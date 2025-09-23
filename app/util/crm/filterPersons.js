const hasValue = (value) => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};

const matchesOperation = (raw, operation, value) => {
  if (operation === "exists") return hasValue(raw);
  if (operation === "not-exists") return !hasValue(raw);
  if (raw == null || value == null || value === "") return true;

  const subject = String(raw).toLowerCase();
  const query = String(value).toLowerCase();

  switch (operation) {
    case "eq":
      return subject === query;
    case "neq":
      return subject !== query;
    case "contains":
      return subject.includes(query);
    case "not-contains":
      return !subject.includes(query);
    case "starts-with":
      return subject.startsWith(query);
    case "ends-with":
      return subject.endsWith(query);
    case "greater-than":
      return parseFloat(subject) > parseFloat(query);
    case "greater-than-or-equal":
      return parseFloat(subject) >= parseFloat(query);
    case "less-than":
      return parseFloat(subject) < parseFloat(query);
    case "less-than-or-equal":
      return parseFloat(subject) <= parseFloat(query);
    case "date-after": {
      const subjectTime = new Date(subject).getTime();
      const queryTime = new Date(query).getTime();
      if (!subjectTime || !queryTime) return true;
      return subjectTime > queryTime;
    }
    case "date-before": {
      const subjectTime = new Date(subject).getTime();
      const queryTime = new Date(query).getTime();
      if (!subjectTime || !queryTime) return true;
      return subjectTime < queryTime;
    }
    default:
      return true;
  }
};

export const filterPersons = ({ persons = [], filters = [], search = "" }) => {
  if (!persons || persons.length === 0) return persons;

  const searchTerm = search.trim().toLowerCase();
  const searched = searchTerm
    ? persons.filter((person) => {
        const haystack = [
          person.name,
          person.source,
          (person.emails || []).map((email) => email.email).join(" "),
          (person.phones || []).map((phone) => phone.phone).join(" "),
          ...Object.values(person.fields || {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchTerm);
      })
    : persons;

  if (!filters.length) return searched;

  return searched.filter((person) =>
    filters.every(({ field, operation, value }) => {
      const raw = field?.accessor ? field.accessor(person) : person[field?.label];
      return matchesOperation(raw, operation, value);
    })
  );
};
