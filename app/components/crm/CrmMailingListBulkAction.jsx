import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dropdown,
  Input,
  Typography,
  useOffcanvas,
  Checkbox,
} from "tabler-react-2";
import toast from "react-hot-toast";
import { Icon } from "../../util/Icon";
import { useMailingListMembers } from "../../hooks/useMailingListMembers";
import { useMailingLists } from "../../hooks/useMailingLists";
import { Row } from "../../util/Flex";

export const CrmMailingListBulkAction = ({
  eventId,
  selectedIds = [],
  onClearSelection,
}) => {
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;
  const selectionCount = selectedIds.length;
  const { OffcanvasElement, offcanvas, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  useEffect(() => {
    if (!hasSelection) {
      close?.();
    }
  }, [hasSelection, close]);

  const openMailingListEditor = () => {
    if (!hasSelection) return;
    offcanvas({
      title: "Edit mailing list memberships",
      content: (
        <MailingListBulkEditor
          eventId={eventId}
          selectedIds={selectedIds}
          onClearSelection={onClearSelection}
          onClose={close}
          selectionCount={selectionCount}
        />
      ),
    });
  };

  if (!hasSelection) return null;

  return (
    <>
      {OffcanvasElement}
      <Alert contentStyle={{ width: "100%" }}>
        <Row justify="space-between" align="center" gap={2}>
          <Row gap={2} align="center">
            <div>
              <Typography.H3 className="mb-0">Selection</Typography.H3>
              <Typography.Text className="mb-0">
                {selectionCount} contact{selectionCount === 1 ? "" : "s"}{" "}
                selected
              </Typography.Text>
            </div>
            <Button outline onClick={() => onClearSelection?.()}>
              Clear
            </Button>
          </Row>

          <Dropdown
            prompt="Actions"
            items={[
              {
                text: "Edit mailing list memberships",
                onclick: openMailingListEditor,
              },
            ]}
          />
        </Row>
      </Alert>
    </>
  );
};

const MailingListBulkEditor = ({
  eventId,
  selectedIds,
  onClearSelection,
  onClose,
  selectionCount,
}) => {
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;

  const {
    mailingLists,
    loading: mailingListsLoading,
    createMailingList,
  } = useMailingLists({ eventId, crmPersonIds: selectedIds });

  const [filter, setFilter] = useState("");
  const [selectedListIds, setSelectedListIds] = useState(() => new Set());
  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingOperations, setPendingOperations] = useState([]);
  const toastIdRef = useRef(null);
  const initialSelectionRef = useRef(new Set());
  const hasInitializedSelectionRef = useRef(false);
  const lastSelectionSignatureRef = useRef(null);

  const currentOperation = pendingOperations.length ? pendingOperations[0] : null;
  const activeMailingListId = currentOperation?.mailingListId ?? null;

  const mailingListMembers = useMailingListMembers({
    eventId,
    mailingListId: activeMailingListId,
  });
  const { addMembers } = mailingListMembers;

  const selectedIdsSignature = useMemo(() => {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return "";
    return Array.from(new Set(selectedIds)).sort().join("|");
  }, [selectedIds]);

  const defaultSelectionSignature = useMemo(() => {
    if (!Array.isArray(mailingLists)) return "";
    const defaults = mailingLists
      .filter((list) => !list.deleted && list.membershipState === "ALL")
      .map((list) => list.id)
      .sort();
    return defaults.join("|");
  }, [mailingLists]);

  useEffect(() => {
    if (!hasSelection) {
      onClose?.();
      setFilter("");
      setSelectedListIds(new Set());
      setNewListTitle("");
      setCreatingList(false);
      setIsSubmitting(false);
      setPendingOperations([]);
      initialSelectionRef.current = new Set();
      hasInitializedSelectionRef.current = false;
      lastSelectionSignatureRef.current = null;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    const selectionSignature = selectedIdsSignature;
    if (
      !hasInitializedSelectionRef.current ||
      lastSelectionSignatureRef.current !== selectionSignature
    ) {
      const defaultIds = defaultSelectionSignature
        ? defaultSelectionSignature.split("|").filter(Boolean)
        : [];
      const defaultSet = new Set(defaultIds);
      setSelectedListIds(defaultSet);
      initialSelectionRef.current = new Set(defaultSet);
      hasInitializedSelectionRef.current = true;
    }

    lastSelectionSignatureRef.current = selectionSignature;
  }, [
    hasSelection,
    onClose,
    selectedIdsSignature,
    defaultSelectionSignature,
  ]);

  useEffect(() => {
    if (!Array.isArray(mailingLists)) return;
    const validIds = new Set(
      mailingLists.filter((list) => !list.deleted).map((list) => list.id)
    );
    setSelectedListIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    initialSelectionRef.current = new Set(
      Array.from(initialSelectionRef.current).filter((id) => validIds.has(id))
    );
  }, [mailingLists]);

  useEffect(() => {
    if (!currentOperation) return;
    if (typeof addMembers !== "function") return;
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;

    if (!toastIdRef.current) {
      toastIdRef.current = toast.loading("Updating mailing lists…");
    }

    let cancelled = false;
    (async () => {
      try {
        const payload =
          currentOperation.action === "remove"
            ? { crmPersonIds: selectedIds, status: "DELETED" }
            : { crmPersonIds: selectedIds };

        const res = await addMembers(payload, { disableToast: true });

        if (cancelled) return;

        if (!res) {
          throw new Error("Error updating mailing lists");
        }

        setPendingOperations((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return prev;
          }

          const next = prev.slice(1);
          if (next.length === 0) {
            if (toastIdRef.current) {
              toast.success("Mailing lists updated", {
                id: toastIdRef.current,
              });
              toastIdRef.current = null;
            }
            onClearSelection?.();
            onClose?.();
            setIsSubmitting(false);
          }
          return next;
        });
      } catch (error) {
        if (cancelled) return;

        const message = error?.message || "Error updating mailing lists";
        if (toastIdRef.current) {
          toast.error(message, { id: toastIdRef.current });
        } else {
          toast.error(message);
        }
        toastIdRef.current = null;
        setPendingOperations([]);
        setIsSubmitting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentOperation,
    addMembers,
    selectedIds,
    onClearSelection,
    onClose,
  ]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
  }, []);

  const availableMailingLists = useMemo(
    () =>
      (mailingLists || [])
        .filter((list) => !list.deleted)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [mailingLists]
  );

  const filteredMailingLists = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return availableMailingLists;
    return availableMailingLists.filter((list) =>
      `${list.title} ${list.id}`.toLowerCase().includes(q)
    );
  }, [availableMailingLists, filter]);

  const toggleList = (id) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateList = async () => {
    const trimmed = newListTitle.trim();
    if (!trimmed) {
      toast.error("Enter a mailing list name");
      return;
    }

    if (creatingList) return;
    setCreatingList(true);
    const mailingList = await createMailingList({ title: trimmed });
    setCreatingList(false);
    if (!mailingList?.id) return;

    setNewListTitle("");
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      next.add(mailingList.id);
      return next;
    });
  };

  const hasChanges = (() => {
    const initial = initialSelectionRef.current;
    for (const id of selectedListIds) {
      if (!initial.has(id)) {
        return true;
      }
    }
    for (const id of initial) {
      if (!selectedListIds.has(id)) {
        return true;
      }
    }
    return false;
  })();

  const handleSubmit = () => {
    if (!hasSelection) return;

    const initial = initialSelectionRef.current;
    const listsToAdd = Array.from(selectedListIds).filter(
      (id) => !initial.has(id)
    );
    const listsToRemove = Array.from(initial).filter(
      (id) => !selectedListIds.has(id)
    );

    if (listsToAdd.length === 0 && listsToRemove.length === 0) {
      toast.error("No changes to apply");
      return;
    }

    setIsSubmitting(true);
    const operations = [
      ...listsToAdd.map((mailingListId) => ({ mailingListId, action: "add" })),
      ...listsToRemove.map((mailingListId) => ({
        mailingListId,
        action: "remove",
      })),
    ];
    setPendingOperations(operations);
  };

  const disableSubmit =
    !hasSelection || isSubmitting || creatingList || !hasChanges;

  return (
    <div
      className="d-flex flex-column gap-3"
      style={{ height: "100%", maxHeight: "calc(100dvh)" }}
    >
      <div>
        <Typography.H3 className="mb-1">
          Edit mailing list memberships
        </Typography.H3>
        <Typography.Text className="mb-0">
          Updating {selectionCount} contact{selectionCount === 1 ? "" : "s"}
        </Typography.Text>
      </div>

      <Input
        placeholder="Search mailing lists"
        value={filter}
        onChange={setFilter}
        disabled={mailingListsLoading}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          borderTop: "1px solid var(--tblr-border-color)",
          borderBottom: "1px solid var(--tblr-border-color)",
          padding: "0.5rem 0",
        }}
      >
        {mailingListsLoading ? (
          <Typography.Text className="text-muted">Loading…</Typography.Text>
        ) : filteredMailingLists.length === 0 ? (
          <Typography.Text className="text-muted">
            No mailing lists
          </Typography.Text>
        ) : (
          <div className="list-group list-group-flush border-0">
            {filteredMailingLists.map((list) => {
              const isSelected = selectedListIds.has(list.id);
              const checkboxValue = isSelected
                ? true
                : list.membershipState === "PARTIAL"
                ? "PARTIAL"
                : false;

              return (
                <label
                  key={list.id}
                  className="list-group-item d-flex align-items-center border-0"
                  style={{ cursor: "pointer" }}
                >
                  <Checkbox
                    value={checkboxValue}
                    onChange={() => toggleList(list.id)}
                    disabled={isSubmitting}
                  />
                  <div className="flex-fill">
                    <div className="fw-bold">{list.title}</div>
                    <div className="text-muted small">
                      {list.memberCount} Member{list.memberCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="d-flex flex-column gap-2">
        <Typography.H5 className="mb-0">Create mailing list</Typography.H5>
        <Row gap={0.5} align="center">
          <Input
            value={newListTitle}
            onChange={setNewListTitle}
            placeholder="Mailing list name"
            disabled={creatingList || isSubmitting}
            className="mb-0 flex-grow-1"
          />
          <Button
            onClick={handleCreateList}
            disabled={!newListTitle.trim() || creatingList || isSubmitting}
            loading={creatingList}
          >
            <Row gap={0.5} align="center">
              <Icon i="plus" size={16} />
              Create
            </Row>
          </Button>
        </Row>
      </div>

      <Row justify="end" gap={0.5}>
        <Button
          outline
          onClick={onClose}
          disabled={isSubmitting || creatingList}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={disableSubmit}
          loading={isSubmitting}
          variant="primary"
        >
          Add to selected lists
        </Button>
      </Row>
    </div>
  );
};
