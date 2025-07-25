// FieldConsumer.jsx
import React from "react";
import { Input, DropdownInput } from "tabler-react-2";

export const FieldConsumer = ({ field, value, error, onInput }) => {
  const isError = Boolean(error);
  const commonProps = {
    label: field.label,
    hint: field.description,
    required: field.required,
    onInput,
    variant: isError ? "danger" : undefined,
    value,
    autocomplete: field.autocompleteType,
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
    default:
      return null;
  }
};
