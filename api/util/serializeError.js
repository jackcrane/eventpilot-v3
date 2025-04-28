export const serializeError = (result) => {
  const serializedError = result.error.issues
    .map((issue) => {
      return issue.message;
    })
    .join(", ");
  return serializedError;
};
