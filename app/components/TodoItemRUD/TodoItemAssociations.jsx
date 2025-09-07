import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Typography } from "tabler-react-2";
import { useFormResponses } from "../../hooks/useFormResponses";
import { Row } from "../../util/Flex";
import { Loading } from "../loading/Loading";

/**
 * Volunteer associations editor for a Todo.
 * Only handles volunteer registrations for now.
 */
export const TodoItemAssociations = ({ todo, eventId, updateTodo }) => {
  const { responses, fields, loading } = useFormResponses(eventId);

  // Resolve likely name/email fields for display
  const nameField = useMemo(() => {
    return (
      fields.find((f) => f.eventpilotFieldType === "volunteerName") ||
      fields.find((f) => (f.label || "").toLowerCase().includes("name")) ||
      null
    );
  }, [fields]);
  const emailField = useMemo(() => {
    return (
      fields.find((f) => f.eventpilotFieldType === "volunteerEmail") ||
      fields.find((f) => (f.type || "").toLowerCase() === "email") ||
      null
    );
  }, [fields]);

  const initialSelected = useMemo(() => {
    const ids = (todo?.VolunteerRegistration || []).map((v) => v.id);
    return new Set(ids);
  }, [todo]);

  const [selected, setSelected] = useState(initialSelected);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  // Keep selection in sync when todo prop changes
  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter((r) => {
      const name = nameField ? r[nameField.id] || "" : "";
      const email = emailField ? r[emailField.id] || "" : "";
      const text = `${name || ""} ${
        typeof email === "string" ? email : email?.label || ""
      }`.toLowerCase();
      return text.includes(q) || (r.id || "").toLowerCase().includes(q);
    });
  }, [responses, filter, nameField, emailField]);

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const save = async () => {
    if (!updateTodo) return;
    setSaving(true);
    try {
      const ok = await updateTodo({
        volunteerRegistrationIds: Array.from(selected),
      });
      if (!ok) return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-2">
      <Typography.B className="mb-1">Volunteers</Typography.B>
      <Typography.Text className="text-muted mb-2" style={{ fontSize: 12 }}>
        Link this todo to one or more volunteer registrations.
      </Typography.Text>

      <Input
        placeholder="Search by name or email"
        value={filter}
        onChange={setFilter}
      />

      <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 8 }}>
        {loading ? (
          <Loading text="Loading volunteers..." />
        ) : responses.length === 0 ? (
          <Typography.Text className="text-muted">
            No volunteers yet.
          </Typography.Text>
        ) : (
          <div className="list-group list-group-flush">
            {filtered.map((r) => {
              const name = nameField ? r[nameField.id] : null;
              const emailVal = emailField ? r[emailField.id] : null;
              const email =
                typeof emailVal === "string" ? emailVal : emailVal?.label;
              const checked = selected.has(r.id);
              return (
                <label
                  key={r.id}
                  className="list-group-item d-flex align-items-center p-2"
                  style={{ cursor: "pointer" }}
                >
                  <input
                    className="form-check-input m-0 me-2"
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r.id)}
                  />
                  <div className="flex-fill">
                    <div className="fw-bold">{name || "Volunteer"}</div>
                    <div className="text-muted small">{email || r.id}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <Row justify="end" className="mt-2">
        <Button onClick={save} loading={saving} variant="primary">
          Save Associations
        </Button>
      </Row>
    </div>
  );
};

export default TodoItemAssociations;
