import { useState, useMemo } from "react";
import { Steps, Typography, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { FieldConsumer } from "../FieldConsumer/FieldConsumer";
import { inputTypes } from "../FormBuilder.v2/InputTypes";

export const FormConsumer = ({ pages, showSteps = true, eventId }) => {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field) => {
    const def = inputTypes.find((t) => t.id === field.type.toLowerCase());
    const schema = def?.schema;
    const value = responses[field.id];

    if (value === undefined || value === "" || value === null) {
      return !field.required;
    }
    if (!schema) return true;
    return schema.safeParse(value).success;
  };

  const isPageValid = useMemo(
    () => pages[step].fields.every(validateField),
    [pages, step, responses]
  );

  const handleInput = (fieldId, value) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
  };

  return (
    <>
      {showSteps && pages.length > 1 && (
        <Steps
          steps={pages.map((p, i) => ({
            text: p.name || `Page ${i + 1}`,
            active: step === i,
          }))}
          className="mb-3"
        />
      )}

      <Typography.H1>{pages[step]?.name || `Page ${step + 1}`}</Typography.H1>

      {pages[step]?.fields.map((field) => {
        const invalid = touched[field.id] && !validateField(field);
        return (
          <div key={field.id} className="mb-4">
            <FieldConsumer
              field={{ ...field, type: field.type.toLowerCase() }}
              value={responses[field.id]}
              invalid={invalid}
              onInput={(v) => handleInput(field.id, v)}
              eventId={eventId}
            />
          </div>
        );
      })}

      <Row gap={1} justify="space-between" className="mt-3">
        {step > 0 && (
          <Button onClick={() => setStep((s) => s - 1)}>
            <Row gap={1} align="center">
              <Icon i="arrow-left" size={18} />
              Back
            </Row>
          </Button>
        )}

        <div style={{ flex: 1 }} />

        {step < pages.length - 1 ? (
          <Button
            onClick={() => isPageValid && setStep((s) => s + 1)}
            variant="primary"
            disabled={!isPageValid}
          >
            <Row gap={1} align="center">
              Next
              <Icon i="arrow-right" size={18} />
            </Row>
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!isPageValid}
            onClick={() => null}
          >
            <Row gap={1} align="center">
              Submit
              <Icon i="arrow-right" size={18} />
            </Row>
          </Button>
        )}
      </Row>
    </>
  );
};
