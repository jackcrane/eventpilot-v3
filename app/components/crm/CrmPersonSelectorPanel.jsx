import React, { useEffect, useMemo, useState } from "react";
import { Typography, Input, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Loading } from "../loading/Loading";

const MAX_RENDER = 200;

export const CrmPersonSelectorPanel = ({
  title = "CRM",
  heading = "Select Contacts",
  searchPlaceholder = "Search by name or email",
  submitLabel = "Save",
  cancelLabel = "Cancel",
  items = [],
  loading = false,
  initialSelectedIds = [],
  onSubmit,
  onCancel,
}) => {
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [localSelected, setLocalSelected] = useState(
    () => new Set(initialSelectedIds)
  );

  useEffect(() => {
    setLocalSelected(new Set(initialSelectedIds));
  }, [initialSelectedIds]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const base = `${item.title || ""} ${item.subtitle || ""}`.toLowerCase();
      const id = (item.id || "").toLowerCase();
      return base.includes(q) || id.includes(q);
    });
  }, [items, filter]);

  const visible = useMemo(
    () => filtered.slice(0, MAX_RENDER),
    [filtered]
  );
  const isCropped = filtered.length > MAX_RENDER;
  const hasSelection = localSelected.size > 0;

  const toggle = (id) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!onSubmit || saving || localSelected.size === 0) return;
    setSaving(true);
    try {
      const result = await onSubmit(Array.from(localSelected));
      if (result !== false) {
        onCancel?.();
      } else {
        setSaving(false);
      }
    } catch (e) {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    onCancel?.();
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
        <Typography.H5 className="mb-0 text-secondary">{title}</Typography.H5>
        <Typography.H1>{heading}</Typography.H1>
        <Input
          placeholder={searchPlaceholder}
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
          borderTop: "1px solid var(--tblr-border-color)",
          borderBottom: "1px solid var(--tblr-border-color)",
        }}
      >
        {loading ? (
          <div className="p-3">
            <Loading gradient={false} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-3">
            <Typography.Text className="text-muted">No results</Typography.Text>
          </div>
        ) : (
          <div className="list-group list-group-flush border-0">
            {visible.map((item) => (
              <label
                key={item.id}
                className="list-group-item d-flex align-items-center border-0"
                style={{ cursor: "pointer" }}
              >
                <input
                  className="form-check-input m-0 me-2"
                  type="checkbox"
                  checked={localSelected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <div className="flex-fill">
                  <div className="fw-bold">{item.title || item.id}</div>
                  {item.subtitle ? (
                    <div className="text-muted small">{item.subtitle}</div>
                  ) : null}
                </div>
              </label>
            ))}
            {isCropped ? (
              <div className="list-group-item border-0 p-2">
                <Typography.Text className="text-muted small">
                  Some contacts were hidden. Refine your search to narrow the list.
                </Typography.Text>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Row justify="flex-end" gap={0.5} className="mt-2">
        <Button outline onClick={handleCancel} disabled={saving}>
          {cancelLabel}
        </Button>
        <Button
          onClick={handleSubmit}
          loading={saving}
          disabled={!hasSelection || saving}
          variant="primary"
        >
          {submitLabel}
        </Button>
      </Row>
    </div>
  );
};

export default CrmPersonSelectorPanel;
