import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Table, Button, Typography, Input, useOffcanvas } from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useEmailTemplates } from "../../../../../../hooks/useEmailTemplates";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";

const RenameTemplateForm = ({ template, onSubmit, onCancel }) => {
  const [name, setName] = useState(template?.name || "");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    const next = name.trim();
    if (!next || submitting) return;
    try {
      setSubmitting(true);
      const ok = await onSubmit(next);
      if (!ok) setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
    }
  };

  const trimmed = name.trim();
  const showError = touched && !trimmed;
  const canSubmit = Boolean(trimmed) && !submitting;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <Typography.H5 className="mb-0 text-secondary">TEMPLATE</Typography.H5>
        <Typography.H1 className="mb-2">{template.name}</Typography.H1>
        <Typography.Text className="text-muted">
          Update the display name for this template.
        </Typography.Text>
      </div>
      <Input
        label="Template name"
        value={name}
        onChange={(value) => setName(value)}
        onBlur={() => setTouched(true)}
        placeholder="Template name"
        required
        invalid={showError}
        invalidText={showError ? "Name is required" : undefined}
      />
      <Row gap={0.5} justify="flex-end">
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={!canSubmit}
        >
          Save
        </Button>
      </Row>
    </form>
  );
};

export const EventEmailTemplatesPage = () => {
  const { eventId } = useParams();
  const {
    templates,
    loading,
    error,
    updateEmailTemplate,
    deleteEmailTemplate,
  } = useEmailTemplates({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1051 },
  });

  const handleRename = async (template) => {
    offcanvas({
      title: "Rename Template",
      content: (
        <RenameTemplateForm
          template={template}
          onSubmit={async (name) => {
            const trimmed = name?.trim();
            if (!trimmed) {
              return false;
            }
            if (trimmed === template.name) {
              close();
              return true;
            }
            const success = await updateEmailTemplate(template.id, {
              name: trimmed,
              textBody: template.textBody,
            });
            if (success) close();
            return success;
          }}
          onCancel={close}
        />
      ),
    });
  };

  const handleDelete = async (template) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this template?"
    );
    if (!confirmed) return;
    await deleteEmailTemplate(template.id);
  };

  return (
    <EventPage
      title="Email Templates"
      description="Manage reusable email templates for your event."
      loading={loading}
    >
      {OffcanvasElement}
      <Row
        justify="space-between"
        align="center"
        style={{ marginBottom: templates?.length ? 16 : 0 }}
      >
        <div />
        <Link
          to={`/events/${eventId}/email/templates/new`}
          className="btn btn-primary"
        >
          New Template
        </Link>
      </Row>
      {error ? (
        <Typography.Text className="text-danger">
          Failed to load templates. Please try again.
        </Typography.Text>
      ) : templates?.length ? (
        <div className="table-responsive">
          <Table
            className="card"
            columns={[
              {
                label: "Name",
                accessor: "name",
                render: (value, row) => (
                  <div style={{ display: "grid", gap: 4 }}>
                    <Link to={`/events/${eventId}/email/templates/${row.id}`}>
                      {value}
                    </Link>
                  </div>
                ),
              },
              {
                label: "Updated",
                accessor: "updatedAt",
                render: (value) => moment(value).format(DATETIME_FORMAT),
              },
              {
                label: "Actions",
                accessor: "id",
                render: (value, row) => (
                  <Row gap={0.5}>
                    <Button size="sm" onClick={() => handleRename(row)}>
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      style={{ visibility: row.deleted ? "hidden" : "visible" }}
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </Button>
                  </Row>
                ),
              },
            ]}
            data={templates}
          />
        </div>
      ) : (
        <Empty
          gradient={false}
          title="No templates yet."
          text="Create a template and it will appear here."
          action={
            <Link
              to={`/events/${eventId}/email/templates/new`}
              className="btn btn-primary"
            >
              New Template
            </Link>
          }
        />
      )}
    </EventPage>
  );
};

export default EventEmailTemplatesPage;
