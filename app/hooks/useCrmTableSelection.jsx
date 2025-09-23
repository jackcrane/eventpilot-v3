import { useCallback, useMemo, useState } from "react";
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

  const commit = useCallback(
    (next) => {
      if (onSelectionChange) onSelectionChange(Array.from(next));
      else setLocalSelected(next);
    },
    [onSelectionChange]
  );

  const pageIds = useMemo(() => rows.map((row) => row.id).filter(Boolean), [rows]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const togglePage = useCallback(() => {
    const next = new Set(selected);
    if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    commit(next);
  }, [selected, allOnPageSelected, pageIds, commit]);

  const rowSelection = useMemo(() => {
    const entries = Array.from(selected).filter(Boolean);
    return entries.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {});
  }, [selected]);

  const onRowSelectionChange = useCallback(
    (updater) => {
      const nextState =
        typeof updater === "function" ? updater(rowSelection) : updater;
      if (!nextState) {
        commit(new Set());
        return;
      }
      const next = new Set(
        Object.entries(nextState)
          .filter(([, value]) => !!value)
          .map(([key]) => key)
      );
      commit(next);
    },
    [rowSelection, commit]
  );

  const selectionColumn = useMemo(
    () => ({
      id: "__row_selection__",
      header: () => (
        <span style={{ display: "block", height: 0 }}>
          <Checkbox
            label=""
            value={allOnPageSelected}
            onChange={togglePage}
            className="mb-0"
          />
        </span>
      ),
      cell: ({ row }) => (
        <Checkbox
          label=""
          value={row.getIsSelected?.()}
          onChange={() => row.toggleSelected?.()}
          className="mb-0"
        />
      ),
      enableSorting: false,
      size: 36,
    }),
    [allOnPageSelected, togglePage]
  );

  return { selectionColumn, rowSelection, onRowSelectionChange };
};
