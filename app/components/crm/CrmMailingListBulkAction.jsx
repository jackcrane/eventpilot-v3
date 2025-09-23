import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingOperations, setPendingOperations] = useState([]);
  const [operationMap, setOperationMap] = useState(() => new Map());
  const toastIdRef = useRef(null);
  const initialStateRef = useRef(new Map());
  const hadChangesRef = useRef(false);

  const currentOperation = pendingOperations.length ? pendingOperations[0] : null;
  const activeMailingListId = currentOperation?.mailingListId ?? null;

  const mailingListMembers = useMailingListMembers({
    eventId,
    mailingListId: activeMailingListId,
  });
  const { addMembers } = mailingListMembers;

  useEffect(() => {
    if (!hasSelection) {
      onClose?.();
      setFilter("");
      setNewListTitle("");
      setCreatingList(false);
      setIsSubmitting(false);
      setPendingOperations([]);
      setOperationMap(new Map());
      initialStateRef.current = new Map();
      hadChangesRef.current = false;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }
  }, [hasSelection, onClose]);

  const selectedIdsSignature = useMemo(() => {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return "";
    return Array.from(new Set(selectedIds)).sort().join("|");
  }, [selectedIds]);

  useEffect(() => {
    if (!hasSelection) return;
    setOperationMap(new Map());
    setPendingOperations([]);
    setIsSubmitting(false);
    initialStateRef.current = new Map();
    hadChangesRef.current = false;
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [selectedIdsSignature, hasSelection]);

  useEffect(() => {
    if (!Array.isArray(mailingLists)) return;

    const stateMap = new Map();
    mailingLists
      .filter((list) => !list.deleted)
      .forEach((list) => {
        const initialState =
          list.membershipState === "ALL"
            ? "ALL"
            : list.membershipState === "PARTIAL"
            ? "PARTIAL"
            : "NONE";
        stateMap.set(list.id, initialState);
      });

    initialStateRef.current = stateMap;

    setOperationMap((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map();
      for (const [id, action] of prev.entries()) {
        if (stateMap.has(id)) {
          next.set(id, action);
        }
      }
      return next.size === prev.size ? prev : next;
    });
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

        const successCount =
          Number(res?.created ?? 0) +
          Number(res?.reactivated ?? 0) +
          Number(res?.updated ?? 0);
        if (successCount > 0) {
          hadChangesRef.current = true;
        }

        setPendingOperations((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return prev;
          }

          const next = prev.slice(1);
          if (next.length === 0) {
            if (toastIdRef.current) {
              const message = hadChangesRef.current
                ? "Mailing lists updated"
                : "No mailing list memberships were changed";
              const notify = hadChangesRef.current ? toast.success : toast.error;
              notify(message, {
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

  const listById = useMemo(() => {
    const map = new Map();
    for (const list of availableMailingLists) {
      map.set(list.id, list);
    }
    return map;
  }, [availableMailingLists]);

  const computeAffectedCount = useCallback(
    (list, action) => {
      const initialState = initialStateRef.current.get(list.id) ?? "NONE";
      const selectedMatchCount = list.selectedMatchCount ?? 0;

      if (action === "remove") {
        if (initialState === "ALL") return selectionCount;
        if (initialState === "PARTIAL") return selectedMatchCount;
        return 0;
      }

      if (action === "add") {
        if (initialState === "NONE") return selectionCount;
        if (initialState === "PARTIAL") {
          const remaining = selectionCount - selectedMatchCount;
          return remaining > 0 ? remaining : 0;
        }
        return 0;
      }

      return 0;
    },
    [selectionCount]
  );

  const operationDetails = useMemo(() => {
    if (!hasSelection || operationMap.size === 0) return [];

    const entries = Array.from(operationMap.entries()).sort((a, b) => {
      const titleA = listById.get(a[0])?.title ?? "";
      const titleB = listById.get(b[0])?.title ?? "";
      return titleA.localeCompare(titleB);
    });

    return entries
      .map(([mailingListId, action]) => {
        const list = listById.get(mailingListId);
        if (!list) return null;

        const affectedCount = computeAffectedCount(list, action);
        const countText = `${affectedCount} ${
          affectedCount === 1 ? "person" : "people"
        }`;
        const verb = action === "add" ? "add" : "remove";
        const preposition = action === "add" ? "to" : "from";

        return {
          mailingListId,
          action,
          affectedCount,
          description: `${verb} ${countText} ${preposition} ${list.title}`,
        };
      })
      .filter(Boolean);
  }, [hasSelection, operationMap, listById, computeAffectedCount]);

  const filteredMailingLists = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return availableMailingLists;
    return availableMailingLists.filter((list) =>
      `${list.title} ${list.id}`.toLowerCase().includes(q)
    );
  }, [availableMailingLists, filter]);

  const toggleList = (id) => {
    if (isSubmitting) return;

    setOperationMap((prev) => {
      const next = new Map(prev);
      const initialState = initialStateRef.current.get(id) ?? "NONE";
      const current = next.get(id) ?? null;
      let nextAction = null;

      if (initialState === "PARTIAL") {
        if (!current) {
          nextAction = "remove";
        } else if (current === "remove") {
          nextAction = "add";
        } else {
          nextAction = "remove";
        }
      } else if (initialState === "ALL") {
        if (!current) {
          nextAction = "remove";
        } else if (current === "remove") {
          nextAction = null;
        } else {
          nextAction = "remove";
        }
      } else {
        if (!current) {
          nextAction = "add";
        } else if (current === "add") {
          nextAction = null;
        } else {
          nextAction = "add";
        }
      }

      if (nextAction) {
        next.set(id, nextAction);
      } else {
        next.delete(id);
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
    initialStateRef.current = new Map([
      ...initialStateRef.current.entries(),
      [mailingList.id, "NONE"],
    ]);
    setOperationMap((prev) => {
      const next = new Map(prev);
      next.set(mailingList.id, "add");
      return next;
    });
  };

  const hasChanges = operationDetails.length > 0;

  const handleSubmit = () => {
    if (!hasSelection) return;
    if (operationDetails.length === 0) {
      toast.error("No changes to apply");
      return;
    }

    setIsSubmitting(true);
    const operations = operationDetails.map(({ mailingListId, action }) => ({
      mailingListId,
      action,
    }));
    setPendingOperations(operations);
  };

  const disableSubmit =
    !hasSelection || isSubmitting || creatingList || !hasChanges;

  const operationSummaries = useMemo(
    () => operationDetails.map((detail) => detail.description),
    [operationDetails]
  );

  const operationSummaryText = useMemo(() => {
    if (!operationSummaries.length) return "";
    if (operationSummaries.length === 1) {
      return `You are about to ${operationSummaries[0]}.`;
    }
    if (operationSummaries.length === 2) {
      return `You are about to ${operationSummaries[0]} and ${operationSummaries[1]}.`;
    }

    const last = operationSummaries[operationSummaries.length - 1];
    const rest = operationSummaries.slice(0, -1);
    return `You are about to ${rest.join(", ")}, and ${last}.`;
  }, [operationSummaries]);

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
              const pendingAction = operationMap.get(list.id);
              const checkboxValue = (() => {
                if (pendingAction === "add") return true;
                if (pendingAction === "remove") return false;
                if (list.membershipState === "ALL") return true;
                if (list.membershipState === "PARTIAL") return "PARTIAL";
                return false;
              })();

              const selectedMatchCount = list.selectedMatchCount ?? 0;
              const membershipDetail = (() => {
                if (!hasSelection) return null;
                if (selectionCount === 0) return null;
                if (selectedMatchCount === selectionCount) {
                  return "All selected people are members of this list";
                }
                if (selectedMatchCount === 0) {
                  return "None of the selected people are members of this list";
                }
                return `${selectedMatchCount} of ${selectionCount} selected people are members of this list`;
              })();

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
                    {membershipDetail ? (
                      <div className="text-muted small">{membershipDetail}</div>
                    ) : null}
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

      {operationSummaryText ? (
        <Typography.Text className="mb-0">
          {operationSummaryText}
        </Typography.Text>
      ) : null}

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
          Apply mailing list changes
        </Button>
      </Row>
    </div>
  );
};
