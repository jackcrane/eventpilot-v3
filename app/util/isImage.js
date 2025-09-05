export const isImage = (mimeType) => {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "image/gif" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/svg+xml" ||
    mimeType === "image/webp"
  );
};
