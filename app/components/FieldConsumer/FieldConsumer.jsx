// FieldConsumer.jsx
import React from "react";
import { Input, DropdownInput, Checkbox } from "tabler-react-2";
import { MarkdownRender } from "../markdown/MarkdownRenderer";

export const FieldConsumer = ({
  field,
  value,
  error,
  onInput,
  forceNoMargin,
  limitHeight = false,
}) => {
  const isError = Boolean(error);
  const commonProps = {
    label: field.label,
    hint: field.description,
    required: field.required,
    placeholder: field.placeholder,
    onInput,
    variant: isError ? "danger" : undefined,
    value,
    autocomplete: field.autocompleteType,
    className: forceNoMargin && "mb-0",
    style: limitHeight && { maxHeight: "400px", overflowY: "auto" },
  };

  switch (field.type) {
    case "text":
      return (
        <Input {...commonProps} placeholder={field.placeholder} type="text" />
      );
    case "email":
      return (
        <Input {...commonProps} placeholder={field.placeholder} type="email" />
      );
    case "phone":
      return (
        <Input {...commonProps} placeholder={field.placeholder} type="tel" />
      );
    case "shortAnswer":
      return (
        <Input
          {...commonProps}
          placeholder={field.placeholder}
          type="text"
          useTextarea
        />
      );
    case "boolean":
      return <Input {...commonProps} type="checkbox" />;
    case "dropdown":
      return (
        <DropdownInput
          {...commonProps}
          onChange={(v) => onInput(v.id)}
          prompt={field.prompt}
          values={field.options}
          color={isError ? "danger" : undefined}
          outline={isError}
          aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
          className="mb-3"
        />
      );
    case "richtext":
      return (
        <div {...commonProps}>
          <MarkdownRender markdown={field.markdown} />
        </div>
      );
    case "textarea":
      return (
        <Input
          {...commonProps}
          rows={field.rows}
          label={field.label}
          className="mb-3"
          useTextarea={true}
          inputProps={{
            rows: field.rows,
          }}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          {...commonProps}
          label={field.label}
          checked={value}
          onChange={(v) => onInput(v)}
        />
      );
    default:
      return `Unsupported field type: ${field.type}`;
  }
};
