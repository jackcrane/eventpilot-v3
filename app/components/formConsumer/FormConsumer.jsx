import React, { useState } from "react";
import { Input, DropdownInput, Button, Util } from "tabler-react-2";
import { ShiftFinder } from "../shiftFinder/ShiftFinder";

export const FormConsumer = ({
  fields,
  onSubmit,
  initialValues = {},
  loading,
  showShifts = false,
  eventId,
}) => {
  const [values, setValues] = useState(initialValues);
  const [shifts, setShifts] = useState([]);
  const [errors, setErrors] = useState({});
  const handleInput = (id) => (value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: undefined }));
  };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s\-()]{7,}$/;

  const handleSubmit = () => {
    const newErrors = {};
    fields.forEach((field) => {
      const value = values[field.id] || "";
      if (field.required && !value) {
        newErrors[field.id] = true;
      } else if (field.type === "email" && value && !emailRegex.test(value)) {
        newErrors[field.id] = true;
      } else if (field.type === "phone" && value && !phoneRegex.test(value)) {
        newErrors[field.id] = true;
      }
    });
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSubmit(values, shifts);
  };

  return (
    <div>
      {fields.map((field) => {
        const value = values[field.id] || "";
        const isError = !!errors[field.id];
        const commonProps = {
          key: field.id,
          label: field.label,
          hint: field.description,
          required: field.required,
          onInput: handleInput(field.id),
          variant: isError ? "danger" : undefined,
          value,
          autocomplete: field.autocompleteType,
        };
        switch (field.type) {
          case "text":
            return (
              <Input
                {...commonProps}
                placeholder={field.placeholder}
                type="text"
              />
            );
          case "email":
            return (
              <Input
                {...commonProps}
                placeholder={field.placeholder}
                type="email"
              />
            );
          case "phone":
            return (
              <Input
                {...commonProps}
                placeholder={field.placeholder}
                type="tel"
              />
            );
          case "shortAnswer":
            return (
              <Input
                {...commonProps}
                placeholder={field.placeholder}
                type="text"
                useTextarea={true}
              />
            );
          case "boolean":
            return <Input {...commonProps} type="checkbox" />;
          case "dropdown":
            return (
              <DropdownInput
                {...commonProps}
                onChange={(v) => commonProps.onInput(v.id)}
                prompt={field.prompt}
                values={field.options}
                color={isError ? "danger" : undefined}
                outline={isError}
                aprops={{
                  style: { width: "100%", justifyContent: "space-between" },
                }}
                className={"mb-3"}
              />
            );
          default:
            return null;
        }
      })}
      {showShifts && (
        <div className={"mb-3"}>
          <Util.Hr text="Pick some shifts" />
          <ShiftFinder
            eventId={eventId}
            onSelectedShiftChange={(shifts) => setShifts(shifts)}
            shifts={[]}
          />
        </div>
      )}
      <Button onClick={handleSubmit} loading={loading}>
        Submit
      </Button>
    </div>
  );
};
