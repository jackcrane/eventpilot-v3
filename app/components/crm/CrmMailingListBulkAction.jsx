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
  } = useMailingLists({ eventId });

  const [filter, setFilter] = useState("");
  const [selectedListIds, setSelectedListIds] = useState(() => new Set());
  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingListIds, setPendingListIds] = useState([]);
  const toastIdRef = useRef(null);

  const activeMailingListId = pendingListIds.length ? pendingListIds[0] : null;

  const mailingListMembers = useMailingListMembers({
    eventId,
    mailingListId: activeMailingListId,
  });
  const { addMembers } = mailingListMembers;

  useEffect(() => {
    if (!hasSelection) {
      onClose?.();
      setFilter("");
      setSelectedListIds(new Set());
      setNewListTitle("");
      setCreatingList(false);
      setIsSubmitting(false);
      setPendingListIds([]);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [hasSelection, onClose]);

  useEffect(() => {
    if (!Array.isArray(mailingLists)) return;
    setSelectedListIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) =>
          mailingLists.some((list) => list.id === id && !list.deleted)
        )
      );
      return next.size === prev.size ? prev : next;
    });
  }, [mailingLists]);

  useEffect(() => {
    if (!pendingListIds.length) return;
    if (typeof addMembers !== "function") return;

    if (!toastIdRef.current) {
      toastIdRef.current = toast.loading("Adding people…");
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await addMembers(
          {
            crmPersonIds: selectedIds,
          },
          { disableToast: true }
        );

        if (cancelled) return;

        if (!res) {
          throw new Error("Error adding people");
        }

        setPendingListIds((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return prev;
          }

          const next = prev.slice(1);
          if (next.length === 0) {
            if (toastIdRef.current) {
              toast.success("People added", { id: toastIdRef.current });
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

        const message = error?.message || "Error adding people";
        if (toastIdRef.current) {
          toast.error(message, { id: toastIdRef.current });
        } else {
          toast.error(message);
        }
        toastIdRef.current = null;
        setPendingListIds([]);
        setIsSubmitting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingListIds, addMembers, selectedIds, onClearSelection, onClose]);

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

  const handleSubmit = () => {
    if (!hasSelection) return;
    const ids = Array.from(selectedListIds);
    if (!ids.length) {
      toast.error("Select at least one mailing list");
      return;
    }
    setIsSubmitting(true);
    setPendingListIds(ids);
  };

  const disableSubmit =
    !hasSelection || isSubmitting || selectedListIds.size === 0 || creatingList;

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
            {filteredMailingLists.map((list) => (
              <label
                key={list.id}
                className="list-group-item d-flex align-items-center border-0"
                style={{ cursor: "pointer" }}
              >
                <Checkbox
                  value={selectedListIds.has(list.id)}
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
            ))}
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
