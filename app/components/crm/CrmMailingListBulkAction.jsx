import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DropdownInput,
  Input,
  Typography,
} from "tabler-react-2";
import toast from "react-hot-toast";
import { Icon } from "../../util/Icon";
import { useMailingListMembers } from "../../hooks/useMailingListMembers";
import { useMailingLists } from "../../hooks/useMailingLists";
import { Row } from "../../util/Flex";

const CREATE_OPTION_ID = "eventpilot__create_mailing_list";

export const CrmMailingListBulkAction = ({
  eventId,
  selectedIds = [],
  onClearSelection,
}) => {
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;
  const selectionCount = selectedIds.length;

  const {
    mailingLists,
    loading: mailingListsLoading,
    createMailingList,
  } = useMailingLists({ eventId });

  const [mode, setMode] = useState("existing");
  const [selectedMailingListId, setSelectedMailingListId] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(null);

  const activeMailingListId =
    mode === "existing"
      ? selectedMailingListId || null
      : pendingAdd?.listId || null;

  const mailingListMembers = useMailingListMembers({
    eventId,
    mailingListId: activeMailingListId,
  });
  const { addMembers } = mailingListMembers;

  useEffect(() => {
    if (!hasSelection) {
      setMode("existing");
      setSelectedMailingListId("");
      setNewListTitle("");
      setIsSubmitting(false);
    }
  }, [hasSelection]);

  useEffect(() => {
    if (!selectedMailingListId || mode !== "existing") return;
    const exists = mailingLists?.some(
      (list) => list.id === selectedMailingListId && !list.deleted
    );
    if (!exists) {
      setSelectedMailingListId("");
    }
  }, [mailingLists, selectedMailingListId, mode]);

  useEffect(() => {
    if (!pendingAdd || !pendingAdd.listId) return;
    if (typeof addMembers !== "function") return;

    const toProcess = pendingAdd;
    setPendingAdd(null);

    let cancelled = false;
    (async () => {
      const res = await addMembers({
        crmPersonIds: toProcess.crmPersonIds,
      });
      if (!cancelled) {
        if (res) {
          onClearSelection?.();
        }
        setIsSubmitting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingAdd, addMembers, onClearSelection]);

  const mailingListOptions = useMemo(() => {
    const base = (mailingLists || [])
      .filter((list) => !list.deleted)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((list) => ({
        id: list.id,
        value: list.id,
        label: list.title,
      }));

    return [
      ...base,
      base.length ? { type: "divider" } : null,
      {
        id: CREATE_OPTION_ID,
        value: CREATE_OPTION_ID,
        label: (
          <span className="d-inline-flex align-items-center gap-1">
            <Icon i="plus" size={16} /> Create new mailing list
          </span>
        ),
      },
    ].filter(Boolean);
  }, [mailingLists]);

  const handleListChange = (item) => {
    if (!item) {
      setMode("existing");
      setSelectedMailingListId("");
      return;
    }

    if (item.id === CREATE_OPTION_ID) {
      setMode("create");
      setSelectedMailingListId("");
      setNewListTitle("");
      return;
    }

    setMode("existing");
    setSelectedMailingListId(item.value);
  };

  const disableSubmit =
    !hasSelection ||
    isSubmitting ||
    (mode === "existing" && !selectedMailingListId) ||
    (mode === "create" && !newListTitle.trim());

  const handleSubmit = async () => {
    if (!hasSelection) return;

    if (mode === "existing") {
      if (!selectedMailingListId) return;
      setIsSubmitting(true);
      if (typeof addMembers !== "function") {
        toast.error("Select a mailing list");
        setIsSubmitting(false);
        return;
      }

      const res = await addMembers({
        crmPersonIds: selectedIds,
      });
      if (res) {
        onClearSelection?.();
      }
      setIsSubmitting(false);
      return;
    }

    const trimmed = newListTitle.trim();
    if (!trimmed) {
      toast.error("Enter a mailing list name");
      return;
    }

    setIsSubmitting(true);
    const mailingList = await createMailingList({ title: trimmed });
    if (!mailingList?.id) {
      setIsSubmitting(false);
      return;
    }

    setMode("existing");
    setSelectedMailingListId(mailingList.id);
    setNewListTitle("");
    setPendingAdd({ listId: mailingList.id, crmPersonIds: selectedIds });
  };

  if (!hasSelection) return null;

  return (
    <Alert contentStyle={{ width: "100%" }}>
      <Row justify="space-between" align="center" gap={2}>
        <Row gap={2} align="center">
          <div>
            <Typography.H3 className="mb-0">Selection</Typography.H3>
            <Typography.Text className="mb-0">
              {selectionCount} contact{selectionCount === 1 ? "" : "s"} selected
            </Typography.Text>
          </div>
          <Button
            // size="sm"
            outline
            onClick={() => onClearSelection?.()}
            disabled={isSubmitting}
          >
            Clear
          </Button>
        </Row>

        <Row gap={2} align="center">
          <DropdownInput
            items={mailingListOptions}
            prompt={"Select mailing list"}
            loading={mailingListsLoading}
            value={
              mode === "existing" && selectedMailingListId
                ? { id: selectedMailingListId }
                : mode === "create"
                ? { id: CREATE_OPTION_ID }
                : null
            }
            onChange={handleListChange}
            disabled={mailingListsLoading || isSubmitting}
          />

          {mode === "create" && (
            <Input
              value={newListTitle}
              onChange={setNewListTitle}
              placeholder="Mailing list name"
              disabled={isSubmitting}
              className="mb-0"
              style={{ minWidth: 200 }}
            />
          )}

          <Button
            onClick={handleSubmit}
            disabled={disableSubmit}
            loading={isSubmitting}
          >
            Add to list
          </Button>
        </Row>
      </Row>
    </Alert>
  );
};
