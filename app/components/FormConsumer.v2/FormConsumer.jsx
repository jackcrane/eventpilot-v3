import { useState, useMemo, useEffect } from "react";
import { Steps, Typography, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { FieldConsumer } from "../FieldConsumer/FieldConsumer";
import { inputTypes } from "../FormBuilder.v2/InputTypes";

export const FormConsumer = ({
  pages,
  showSteps = true,
  eventId,
  onSubmit,
  mutationLoading,
}) => {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedRegistrationTier, setSelectedRegistrationTier] =
    useState(null);
  const [selectedUpsells, setSelectedUpsells] = useState([]);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState({ id: null, code: "" });

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

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
    () =>
      pages[step].fields.every((field) => {
        const type = field.type.toLowerCase();
        if (type === "registrationtier") {
          return field.required ? selectedRegistrationTier !== null : true;
        } else if (type === "shiftpicker") {
          return field.required ? (selectedShifts?.length ?? 0) > 0 : true;
        } else if (type === "team") {
          const hasSelection =
            Boolean(selectedTeam?.id) || Boolean(selectedTeam?.code?.trim());
          return field.required ? hasSelection : true;
        }
        return validateField(field);
      }),
    [pages, step, responses, selectedRegistrationTier, selectedShifts, selectedTeam]
  );

  const handleInput = (fieldId, value) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
  };

  const handleSubmit = () => {
    const data = {
      responses,
      selectedRegistrationTier,
      selectedUpsells: selectedUpsells.map((u) => u.value),
      selectedTeamId: selectedTeam?.id || null,
      enteredTeamCode: selectedTeam?.code || null,
      selectedShifts,
    };
    onSubmit?.(data);
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
        const invalid =
          touched[field.id] &&
          !(field.type.toLowerCase() === "registrationtier"
            ? selectedRegistrationTier !== null || !field.required
            : validateField(field));

        const type = field.type.toLowerCase();
        const value =
          type === "registrationtier"
            ? selectedRegistrationTier
            : type === "upsells"
            ? selectedUpsells
            : type === "shiftpicker"
            ? selectedShifts
            : type === "team"
            ? selectedTeam
            : responses[field.id];
        const onInput =
          type === "registrationtier"
            ? (v) => setSelectedRegistrationTier(v)
            : type === "upsells"
            ? (v) => setSelectedUpsells(v)
            : type === "shiftpicker"
            ? (v) => setSelectedShifts(v)
            : type === "team"
            ? (v) => setSelectedTeam(v)
            : (v) => handleInput(field.id, v);

        return (
          <div key={field.id} className="mb-4">
            <FieldConsumer
              field={{ ...field, type }}
              value={value}
              invalid={invalid}
              onInput={onInput}
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
            onClick={() => {
              handleSubmit();
              window.scrollTo(0, 0);
            }}
            loading={mutationLoading}
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
