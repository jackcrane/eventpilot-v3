// FormConsumer.jsx
import React, { useState } from "react";
import { Button, Util } from "tabler-react-2";
import { ShiftFinder } from "../shiftFinder/ShiftFinder";
import { FieldConsumer } from "../FieldConsumer/FieldConsumer";

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
      const val = values[field.id] || "";
      if (field.required && !val) {
        newErrors[field.id] = true;
      } else if (field.type === "email" && val && !emailRegex.test(val)) {
        newErrors[field.id] = true;
      } else if (field.type === "phone" && val && !phoneRegex.test(val)) {
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
      {fields.map((field) => (
        <FieldConsumer
          key={field.id}
          field={field}
          value={values[field.id] || ""}
          error={errors[field.id]}
          onInput={handleInput(field.id)}
          eventId={eventId}
        />
      ))}

      {showShifts && (
        <div className="mb-3">
          <Util.Hr text="Pick some shifts" />
          <ShiftFinder
            eventId={eventId}
            onSelectedShiftChange={(s) => setShifts(s)}
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
