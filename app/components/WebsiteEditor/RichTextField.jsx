import { FieldLabel } from "@measured/puck";
import { MarkdownEditor } from "../markdown/MarkdownEditor";

export const RichTextField = ({ field, value, onChange }) => (
  <div
    className="website-editor-richtext-field"
    style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
  >
    <FieldLabel
      label={field?.label ?? "Content"}
      el="label"
      className="website-editor-richtext-field__label"
    />
    {field?.hint ? (
      <small style={{ color: "var(--tblr-secondary-color)", lineHeight: 1.4 }}>
        {field.hint}
      </small>
    ) : null}
    <div>
      <MarkdownEditor
        value={value ?? ""}
        placeholder={field?.placeholder}
        onChange={(nextValue) => {
          onChange(nextValue);
        }}
      />
    </div>
  </div>
);
