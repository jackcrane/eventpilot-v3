import React, { useEffect, useMemo, useState } from "react";
import { Button, Typography, Input, useOffcanvas } from "tabler-react-2";
import { useFormResponses } from "../../hooks/useFormResponses";
import { Row } from "../../util/Flex";
import { Loading } from "../loading/Loading";
import { FormResponseRUD } from "../formResponseRUD/FormResponseRUD";
// import { EntitySelector } from "../EntitySelector/EntitySelector";

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

  // Nested offcanvas for the volunteer selector
  const {
    offcanvas: openSelectorPanel,
    OffcanvasElement: SelectorOffcanvasElement,
    close: closeSelectorPanel,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 450, zIndex: 1052 },
  });

  // Offcanvas for viewing a volunteer's full response
  const {
    offcanvas: openViewerPanel,
    OffcanvasElement: ViewerOffcanvasElement,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 450, zIndex: 1051 },
  });

  // Keep selection in sync when todo prop changes
  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  const selectorItems = useMemo(() => {
    return responses.map((r) => {
      const name = nameField ? r[nameField.id] : null;
      const emailVal = emailField ? r[emailField.id] : null;
      const email = typeof emailVal === "string" ? emailVal : emailVal?.label;
      return {
        id: r.id,
        title: name || "Volunteer",
        subtitle: email || undefined,
      };
    });
  }, [responses, nameField, emailField]);

  const openSelector = () => {
    // Start from current associations
    const initial = new Set(Array.from(initialSelected));

    // Local panel component manages its own selection state and search
    const VolunteerSelectorPanel = () => {
      const [localSelected, setLocalSelected] = useState(initial);
      const [filter, setFilter] = useState("");
      const [saving, setSaving] = useState(false);

      const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return selectorItems;
        return selectorItems.filter((i) => {
          const t = `${i.title || ""} ${i.subtitle || ""}`.toLowerCase();
          return t.includes(q) || (i.id || "").toLowerCase().includes(q);
        });
      }, [selectorItems, filter]);

      const toggle = (id) => {
        setLocalSelected((prev) => {
          const n = new Set(prev);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        });
      };

      const apply = async () => {
        setSaving(true);
        try {
          await save(Array.from(localSelected));
          closeSelectorPanel();
        } finally {
          setSaving(false);
        }
      };

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxHeight: "calc(100dvh)",
          }}
        >
          <div>
            <Typography.H5 className="mb-0 text-secondary">
              VOLUNTEERS
            </Typography.H5>
            <Typography.H1>Select Volunteers</Typography.H1>
            <Input
              placeholder="Search by name or email"
              value={filter}
              onChange={setFilter}
            />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              marginTop: 8,
              maxHeight: "calc(100dvh - 200px)",

              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--tblr-border-color)",
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "var(--tblr-border-color)",
            }}
          >
            {filtered.length === 0 ? (
              <Typography.Text className="text-muted">
                No results
              </Typography.Text>
            ) : (
              <div className="list-group list-group-flush border-0">
                {filtered.map((it) => (
                  <label
                    key={it.id}
                    className="list-group-item d-flex align-items-center border-0"
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      className="form-check-input m-0 me-2"
                      type="checkbox"
                      checked={localSelected.has(it.id)}
                      onChange={() => toggle(it.id)}
                    />
                    <div className="flex-fill">
                      <div className="fw-bold">{it.title || it.id}</div>
                      {it.subtitle && (
                        <div className="text-muted small">{it.subtitle}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Row justify="end" gap={0.5} className="mt-2">
            <Button outline onClick={closeSelectorPanel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={apply} loading={saving} variant="primary">
              Save
            </Button>
          </Row>
        </div>
      );
    };

    openSelectorPanel({ content: <VolunteerSelectorPanel /> });
  };

  const save = async (ids) => {
    const ok = await updateTodo({ volunteerRegistrationIds: ids });
    if (ok) setSelected(new Set(ids));
  };

  return (
    <div className="card p-2">
      <Row justify="space-between" align="center" className="mb-1">
        <div>
          <Typography.B className="mb-1">Volunteers</Typography.B>
          <Typography.Text className="text-muted mb-2" style={{ fontSize: 12 }}>
            Linked volunteer registrations for this todo.
          </Typography.Text>
        </div>
        <Button onClick={openSelector}>Add or remove</Button>
      </Row>

      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {loading ? (
          <Loading text="Loading volunteers..." />
        ) : (todo?.VolunteerRegistration || []).length === 0 ? (
          <Typography.Text className="text-muted">None</Typography.Text>
        ) : (
          <div className="list-group list-group-flush border-0">
            {(todo?.VolunteerRegistration || []).map((v) => {
              const r = responses.find((x) => x.id === v.id);
              const name = nameField ? r?.[nameField.id] : undefined;
              const emailVal = emailField ? r?.[emailField.id] : undefined;
              const email =
                typeof emailVal === "string" ? emailVal : emailVal?.label;
              return (
                <div
                  key={v.id}
                  className="list-group-item border-0 p-2 d-flex align-items-center"
                >
                  <div className="flex-fill">
                    <div className="fw-bold">{name || "Volunteer"}</div>
                    <div className="text-muted small">{email || v.id}</div>
                  </div>
                  <Button
                    outline
                    className="me-1"
                    onClick={() =>
                      openViewerPanel({
                        content: <FormResponseRUD id={v.id} />,
                      })
                    }
                    size="sm"
                  >
                    View
                  </Button>
                  <Button
                    outline
                    variant="danger"
                    onClick={async () => {
                      const current = (todo?.VolunteerRegistration || []).map(
                        (x) => x.id
                      );
                      const next = current.filter((id) => id !== v.id);
                      await save(next);
                    }}
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {SelectorOffcanvasElement}
      {ViewerOffcanvasElement}
    </div>
  );
};

export default TodoItemAssociations;
