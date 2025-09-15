import React, { useState } from "react";
import { Typography, DropdownInput, Input, Button, Util } from "tabler-react-2";

const TITLE_MAP = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const toServerStatus = (key) => (key || "not_started").toUpperCase();

export const TodoCreateForm = ({
  initialStatus = "not_started",
  onCreate,
  onClose,
  initialCrmPeople = [],
  showCrmSection = false,
}) => {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(toServerStatus(initialStatus));
  const [people, setPeople] = useState(initialCrmPeople);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onCreate?.({
        title: t,
        content: details || "",
        status,
        crmPersonIds: people.map((p) => p.id).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">TODO</Typography.H5>
      <Typography.H1>New Todo</Typography.H1>
      <DropdownInput
        label="Status"
        items={[
          {
            id: "NOT_STARTED",
            value: "NOT_STARTED",
            label: TITLE_MAP.NOT_STARTED,
          },
          {
            id: "IN_PROGRESS",
            value: "IN_PROGRESS",
            label: TITLE_MAP.IN_PROGRESS,
          },
          { id: "COMPLETED", value: "COMPLETED", label: TITLE_MAP.COMPLETED },
          { id: "CANCELLED", value: "CANCELLED", label: TITLE_MAP.CANCELLED },
        ]}
        value={status}
        onChange={(i) => setStatus(i.value)}
        className="mb-2"
        required
        aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
      />
      <Input
        label="Title"
        placeholder="What needs to be done?"
        value={title}
        onChange={setTitle}
        required
      />
      <Input
        label="Details"
        placeholder="Add a short description"
        value={details}
        onChange={setDetails}
        useTextarea
        inputProps={{ rows: 5 }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="subtle" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving} variant="primary">
          Create Todo
        </Button>
      </div>
      {showCrmSection && (
        <>
          <Util.Hr />
          <label className="form-label">Linked CRM people</label>
          {people.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {people.map((p) => (
                <span
                  key={p.id}
                  className="badge"
                  style={{
                    background: "var(--tblr-gray-200)",
                    color: "var(--tblr-dark)",
                    padding: "4px 8px",
                    borderRadius: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title={p.name || p.email || "Person"}
                >
                  <span
                    style={{
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name || "Unnamed"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    title="Remove"
                    onClick={() =>
                      setPeople((prev) => prev.filter((x) => x.id !== p.id))
                    }
                    style={{
                      color: "var(--tblr-dark)",
                      textDecoration: "none",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <Typography.Text className="mb-1 text-muted">None</Typography.Text>
          )}
        </>
      )}
    </div>
  );
};

export default TodoCreateForm;
