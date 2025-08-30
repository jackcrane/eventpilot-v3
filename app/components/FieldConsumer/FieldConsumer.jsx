// FieldConsumer.jsx
import React from "react";
import { Input, DropdownInput, Checkbox } from "tabler-react-2";
import { MarkdownRender } from "../markdown/MarkdownRenderer";
import { RegistrationTierListing } from "../RegistrationTierListing/RegistrationTierListing";
import { RegistrationUpsellListing } from "../RegistrationUpsellListing/RegistrationUpsellListing";

export const FieldConsumer = ({
  field,
  value,
  error,
  onInput,
  forceNoMargin,
  invalid,
  limitHeight = false,
  inBuilder = false,
  eventId,
}) => {
  const isError = Boolean(error);
  const commonProps = {
    label: field.label,
    hint: field.description,
    required: field.required,
    placeholder: field.placeholder,
    onChange: onInput,
    variant: isError ? "danger" : undefined,
    value,
    autocomplete: field.autocompleteType,
    invalid,
    className: forceNoMargin ? "mb-0" : "mb-3",
    style: limitHeight ? { maxHeight: "400px", overflowY: "auto" } : undefined,
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
          value={value}
          onChange={(v) => onInput(v)}
        />
      );
    case "registrationtier":
    case "registrationTier":
      return inBuilder ? (
        <>
          <label className="form-label">Registration Tier</label>
          <div className="mb-3 p-2 bg-gray-200">
            A listing of the registration tiers you have set up will appear
            here. A preview is not shown in the form builder, but will be
            present when the form is viewed.
          </div>
        </>
      ) : (
        <RegistrationTierListing
          value={value}
          setTier={(v) => onInput(v.id)}
          eventId={eventId}
        />
      );
    case "upsells":
      return inBuilder ? (
        <>
          <label className="form-label">Upsells</label>
          <div className="mb-3 p-2 bg-gray-200">
            A listing of the upsells you have set up will appear here. A preview
            is not shown in the form builder, but will be present when the form
            is viewed.
          </div>
        </>
      ) : (
        <RegistrationUpsellListing
          eventId={eventId}
          value={value}
          setUpsell={(v) => onInput(v)}
        />
      );
    default:
      return `Unsupported field type: ${field.type}`;
  }
};
