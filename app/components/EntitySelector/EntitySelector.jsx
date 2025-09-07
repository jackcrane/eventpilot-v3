import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input, Button, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";

/**
 * Generic entity selector modal.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - title: string
 * - items: Array<{ id: string, title: string, subtitle?: string }>
 * - selected: Array<string> | Set<string>
 * - onSave: (selectedIds: string[]) => Promise<void> | void
 * - searchPlaceholder?: string
 */
export const EntitySelector = ({
  open,
  onClose,
  title = "Select",
  items = [],
  selected = [],
  onSave,
  searchPlaceholder = "Search",
}) => {
  const initialSelected = useMemo(
    () => new Set(Array.isArray(selected) ? selected : Array.from(selected)),
    [selected]
  );

  const [localSelected, setLocalSelected] = useState(initialSelected);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Reset selection when modal re-opens or source selection changes
    if (open) setLocalSelected(initialSelected);
  }, [open, initialSelected]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const t = `${i.title || ""} ${i.subtitle || ""}`.toLowerCase();
      return t.includes(q) || (i.id || "").toLowerCase().includes(q);
    });
  }, [items, filter]);

  const toggle = (id) => {
    setLocalSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const apply = async () => {
    if (!onSave) return onClose?.();
    setSaving(true);
    try {
      await onSave(Array.from(localSelected));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Input
        placeholder={searchPlaceholder}
        value={filter}
        onChange={setFilter}
      />

      <div style={{ maxHeight: 340, overflowY: "auto", marginTop: 8 }}>
        {filtered.length === 0 ? (
          <Typography.Text className="text-muted">No results</Typography.Text>
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
        <Button outline onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={apply} loading={saving} variant="primary">
          Save
        </Button>
      </Row>
    </Modal>
  );
};

export default EntitySelector;

