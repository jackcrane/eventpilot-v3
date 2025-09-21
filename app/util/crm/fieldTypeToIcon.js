export const fieldTypeToIcon = (type) => {
  switch (type) {
    case "TEXT":
      return "cursor-text";
    case "EMAIL":
      return "mail";
    case "PHONE":
      return "phone";
    case "BOOLEAN":
      return "toggle-left";
    case "DATE":
      return "calendar";
    case "NUMBER":
      return "number";
    default:
      return "alert-hexagon";
  }
};
