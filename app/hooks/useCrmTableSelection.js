import { useMemo, useState } from "react";
import { Checkbox } from "tabler-react-2";

export const useCrmTableSelection = ({
  rows = [],
  controlledSelectedIds,
  onSelectionChange,
}) => {
  const [localSelected, setLocalSelected] = useState(new Set());

  const selected = useMemo(() => {
    if (Array.isArray(controlledSelectedIds)) {
      return new Set(controlledSelectedIds);
    }
    return localSelected;
  }, [controlledSelectedIds, localSelected]);

  const commit = (next) => {
    if (onSelectionChange) onSelectionChange(Array.from(next));
    else setLocalSelected(next);
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commit(next);
  };

  const pageIds = useMemo(() => rows.map((row) => row.id).filter(Boolean), [rows]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const togglePage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    commit(next);
  };

  const selectionColumn = useMemo(
    () => ({
      label: (
        <span style={{ display: "block", height: 0 }}>
          <Checkbox
            label=""
            value={allOnPageSelected}
            onChange={togglePage}
            className="mb-0"
          />
        </span>
      ),
      accessor: "id",
      sortable: false,
      render: (id) => (
        <Checkbox
          label=""
          value={selected.has(id)}
          onChange={() => toggleOne(id)}
          className="mb-0"
        />
      ),
    }),
    [selected, allOnPageSelected]
  );

  return { selectionColumn };
};
