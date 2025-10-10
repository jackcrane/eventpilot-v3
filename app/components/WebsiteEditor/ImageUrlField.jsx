import { useMemo } from "react";
import { FieldLabel } from "@measured/puck";
import { Input } from "tabler-react-2";
import { ImageInput } from "../ImageInput/ImageInput";

const normalizeUploadedUrl = (data) => {
  if (!data || typeof data !== "object") return "";
  if (typeof data.url === "string" && data.url.length > 0) return data.url;
  if (typeof data.location === "string" && data.location.length > 0) {
    return data.location;
  }
  return "";
};

export const ImageUrlField = ({ field, value, onChange }) => {
  const placeholder = useMemo(() => field?.placeholder || "https://…", [field]);

  return (
    <div
      className="website-editor-imageurl-field"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <FieldLabel
          label={field?.label ?? "Image"}
          el="label"
          className="website-editor-imageurl-field__label"
        />
        {field?.hint ? (
          <small
            style={{ color: "var(--tblr-secondary-color)", lineHeight: 1.4 }}
          >
            {field.hint}
          </small>
        ) : (
          <small
            style={{ color: "var(--tblr-secondary-color)", lineHeight: 1.4 }}
          >
            Upload a file or paste a full image URL.
          </small>
        )}
      </div>
      <ImageInput
        value={value}
        onSuccessfulUpload={(data) => {
          const nextUrl = normalizeUploadedUrl(data);
          if (nextUrl) onChange(nextUrl);
        }}
        aria-label="Upload image"
      />
      <Input
        label="Image URL"
        value={value || ""}
        onChange={(nextValue) => onChange(nextValue)}
        placeholder={placeholder}
      />
    </div>
  );
};
