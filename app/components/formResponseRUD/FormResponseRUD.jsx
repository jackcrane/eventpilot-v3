import React from "react";
import { useParams } from "react-router-dom";
import { useFormResponse } from "../../hooks/useFormResponse";
import { Typography, Util, Button, useConfirm } from "tabler-react-2";
import { FormConsumer } from "../formConsumer/FormConsumer";

export const FormResponseRUD = ({ id, confirm }) => {
  const { eventId, campaignId } = useParams();
  const {
    response,
    fields,
    loading,
    error,
    updateResponse,
    deleteResponse,
    mutationLoading,
    deleteLoading,
  } = useFormResponse(eventId, campaignId, id);

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!response) return <div>Response not found</div>;

  // split & order active fields
  const [existing, not] = fields.reduce(
    ([inForm, notInForm], f) =>
      f.currentlyInForm
        ? [[...inForm, f], notInForm]
        : [inForm, [...notInForm, f]],
    [[], []]
  );
  const ordered = existing.sort((a, b) => a.order - b.order);

  // build initialValues
  const initialValues = {};
  ordered.forEach((f) => {
    initialValues[f.id] = response[f.id] ?? "";
  });

  // strip out deleted options
  const formFields = ordered.map((f) => ({
    ...f,
    options: f.options.filter((o) => !o.deleted),
  }));

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">VOLUNTEER</Typography.H5>
      <Typography.H1>{response.flat.name}</Typography.H1>
      <Util.Hr text="Form Responses" />

      <FormConsumer
        fields={formFields}
        initialValues={initialValues}
        onSubmit={updateResponse}
        disabled={mutationLoading}
      />

      <div className="mt-3">
        <Button
          variant="danger"
          outline
          onClick={async () => {
            if (
              await confirm({
                title: "Are you sure you want to delete this submission?",
                text: "This action cannot be undone.",
                commitText: "Delete",
              })
            )
              await deleteResponse();
          }}
          disabled={deleteLoading}
        >
          {deleteLoading ? "Deleting…" : "Delete Submission"}
        </Button>
      </div>
    </div>
  );
};
