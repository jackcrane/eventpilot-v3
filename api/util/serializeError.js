export const serializeError = (result) => {
  const serializedError = result.error.issues
    .map((issue) => {
      return issue.path.join(".") + " " + issue.message;
    })
    .join(", ");
  console.log(serializedError);
  return serializedError;
};
