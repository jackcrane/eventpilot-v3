import React, { useEffect, useState } from "react";
import { Button, Input } from "tabler-react-2";
import { useNavigate, useParams } from "react-router-dom";
import { EmailTemplateEditor } from "../EmailTemplateEditor/EmailTemplateEditor";
import { Row } from "../../util/Flex";
import { Loading } from "../loading/Loading";

export const EmailTemplateCRUD = ({
  template,
  loading,
  onSubmit,
  onCancel,
  submitLabel,
  variables,
}) => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEditing = Boolean(template?.id);

  const [name, setName] = useState(template?.name || "");
  const [bodyText, setBodyText] = useState(template?.textBody || ""); // controlled text (with {{tokens}})
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync when template changes
  useEffect(() => {
    setName(template?.name || "");
    setBodyText(template?.textBody || "");
  }, [template?.id, template?.name, template?.textBody]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (submitting) return;

    const trimmed = name.trim();
    if (!trimmed || typeof onSubmit !== "function") return;

    setSubmitting(true);
    try {
      const result = await onSubmit({
        name: trimmed,
        textBody: bodyText || "", // emit text-only body
      });
      if (!result) return;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  const invalidName = touched && !name.trim();
  const effectiveSubmitLabel =
    submitLabel || (isEditing ? "Save changes" : "Create template");

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gap: 16 }}>
        <Input
          label="Template name"
          value={name}
          onChange={setName}
          onBlur={() => setTouched(true)}
          required
          placeholder="Template name"
          invalid={invalidName}
          invalidText={invalidName ? "Name is required" : undefined}
        />

        <EmailTemplateEditor
          value={bodyText} // controlled value (plain text with {{tokens}})
          onChange={setBodyText} // receives plain text on every change
          variables={variables}
          placeholder="Type your email here… Use {{double braces}} to insert variables, e.g., {{name}}"
        />
      </div>

      <Row justify="flex-end" gap={0.5}>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={invalidName || submitting}
        >
          {effectiveSubmitLabel}
        </Button>
      </Row>
    </form>
  );
};
