import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Table,
  Button,
  Typography,
  Input,
  useOffcanvas,
  Badge,
} from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useMailingLists } from "../../../../../../hooks/useMailingLists";
import { MailingListFilterBar } from "../../../../../../components/mailingLists/MailingListFilterBar";

const MAILING_LIST_FILTER_DEFINITIONS = [
  {
    label: "title",
    hrTitle: "Title",
    type: "text",
    defaultOperation: "contains",
  },
  {
    label: "memberCount",
    hrTitle: "Members",
    type: "number",
    defaultOperation: "greater-than-or-equal",
  },
  {
    label: "createdAt",
    hrTitle: "Created Date",
    type: "date",
    defaultOperation: "date-after",
  },
  {
    label: "updatedAt",
    hrTitle: "Updated Date",
    type: "date",
    defaultOperation: "date-after",
  },
  {
    label: "status",
    hrTitle: "Status",
    type: "enum",
    options: ["Active", "Deleted"],
    defaultOperation: "eq",
  },
  {
    label: "aiSegment",
    hrTitle: "AI Linked",
    type: "enum",
    options: ["Linked", "Not Linked"],
    defaultOperation: "eq",
  },
];

const coerceFilterValue = (raw) => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "object" && "target" in raw) {
    return raw.target?.value ?? "";
  }
  return String(raw ?? "");
};

const normalizeText = (value) => (value ?? "").toString().trim();

const parseDateValue = (value) => {
  const raw = coerceFilterValue(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchesText = (operation, candidate, value) => {
  const source = normalizeText(candidate);
  if (operation === "exists") return source.length > 0;
  if (operation === "not-exists") return source.length === 0;

  const target = normalizeText(value).toLowerCase();
  if (!target) return true;
  const comparable = source.toLowerCase();

  switch (operation) {
    case "eq":
      return comparable === target;
    case "neq":
      return comparable !== target;
    case "contains":
      return comparable.includes(target);
    case "not-contains":
      return !comparable.includes(target);
    case "starts-with":
      return comparable.startsWith(target);
    case "ends-with":
      return comparable.endsWith(target);
    default:
      return true;
  }
};

const matchesNumber = (operation, candidate, value) => {
  if (operation === "exists") {
    return candidate !== null && candidate !== undefined;
  }
  if (operation === "not-exists") {
    return candidate === null || candidate === undefined;
  }

  const parsedCandidate =
    candidate === null || candidate === undefined
      ? Number.NaN
      : typeof candidate === "number"
      ? candidate
      : Number(candidate);
  const parsedValue = Number(coerceFilterValue(value));

  if (Number.isNaN(parsedCandidate) || Number.isNaN(parsedValue)) {
    return false;
  }

  switch (operation) {
    case "eq":
      return parsedCandidate === parsedValue;
    case "neq":
      return parsedCandidate !== parsedValue;
    case "greater-than":
      return parsedCandidate > parsedValue;
    case "greater-than-or-equal":
      return parsedCandidate >= parsedValue;
    case "less-than":
      return parsedCandidate < parsedValue;
    case "less-than-or-equal":
      return parsedCandidate <= parsedValue;
    default:
      return true;
  }
};

const matchesDate = (operation, candidate, value) => {
  const candidateDate = candidate ? new Date(candidate) : null;
  const validCandidate =
    candidateDate && !Number.isNaN(candidateDate.getTime()) ? candidateDate : null;

  if (operation === "exists") return Boolean(validCandidate);
  if (operation === "not-exists") return !validCandidate;

  const filterDate = parseDateValue(value);
  if (!validCandidate || !filterDate) return false;

  const candidateTime = validCandidate.getTime();
  const filterTime = filterDate.getTime();

  switch (operation) {
    case "eq":
      return candidateTime === filterTime;
    case "neq":
      return candidateTime !== filterTime;
    case "date-after":
      return candidateTime >= filterTime;
    case "date-before":
      return candidateTime <= filterTime;
    default:
      return true;
  }
};

const matchesEnum = (operation, candidate, value) => {
  const source = normalizeText(candidate);
  if (operation === "exists") return source.length > 0;
  if (operation === "not-exists") return source.length === 0;

  const target = normalizeText(value).toLowerCase();
  if (!target) return true;
  const comparable = source.toLowerCase();

  switch (operation) {
    case "eq":
      return comparable === target;
    case "neq":
      return comparable !== target;
    default:
      return true;
  }
};

const matchesFilter = (mailingList, filter) => {
  if (!filter?.field) return true;
  const { label } = filter.field;
  const operation = filter.operation;

  switch (label) {
    case "title":
      return matchesText(operation, mailingList.title, filter.value);
    case "memberCount":
      return matchesNumber(operation, mailingList.memberCount, filter.value);
    case "createdAt":
      return matchesDate(operation, mailingList.createdAt, filter.value);
    case "updatedAt":
      return matchesDate(operation, mailingList.updatedAt, filter.value);
    case "status":
      return matchesEnum(
        operation,
        mailingList.deleted ? "Deleted" : "Active",
        filter.value
      );
    case "aiSegment":
      return matchesEnum(
        operation,
        mailingList.crmSavedSegmentId ? "Linked" : "Not Linked",
        filter.value
      );
    default:
      return true;
  }
};

const applyMailingListFilters = (mailingLists = [], search, filters = []) => {
  const trimmedSearch = normalizeText(search).toLowerCase();
  return mailingLists.filter((list) => {
    const matchesSearch = trimmedSearch
      ? (list.title || "").toLowerCase().includes(trimmedSearch)
      : true;
    if (!matchesSearch) return false;

    if (!filters.length) return true;
    return filters.every((filter) => matchesFilter(list, filter));
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (e) {
    return "—";
  }
};

const CreateMailingListForm = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    const next = title.trim();
    if (!next || submitting) return;
    try {
      setSubmitting(true);
      const ok = await onSubmit(next);
      if (!ok) setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
    }
  };

  const trimmed = title.trim();
  const showError = touched && !trimmed;
  const canSubmit = Boolean(trimmed) && !submitting;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <Typography.H5 className="mb-0 text-secondary">
          MAILING LIST
        </Typography.H5>
        <Typography.H1 className="mb-2">Create mailing list</Typography.H1>
        <Typography.Text className="text-muted">
          Pick a name to create your new mailing list.
        </Typography.Text>
      </div>
      <Input
        label="Mailing list name"
        value={title}
        onChange={(value) => setTitle(value)}
        onBlur={() => setTouched(true)}
        placeholder="List name"
        required
        invalid={showError}
        invalidText={showError ? "Title is required" : undefined}
      />
      <Row gap={0.5} justify="flex-end">
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={!canSubmit}
        >
          Create
        </Button>
      </Row>
    </form>
  );
};

const RenameMailingListForm = ({ mailingList, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(mailingList?.title || "");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    const next = title.trim();
    if (!next || submitting) return;
    try {
      setSubmitting(true);
      const ok = await onSubmit(next);
      if (!ok) setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
    }
  };

  const trimmed = title.trim();
  const showError = touched && !trimmed;
  const canSubmit = Boolean(trimmed) && !submitting;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <Typography.H5 className="mb-0 text-secondary">
          MAILING LIST
        </Typography.H5>
        <Typography.H1 className="mb-2">{mailingList.title}</Typography.H1>
        <Typography.Text className="text-muted">
          Update the name shown for this mailing list.
        </Typography.Text>
      </div>
      <Input
        label="Mailing list name"
        value={title}
        onChange={(value) => setTitle(value)}
        onBlur={() => setTouched(true)}
        placeholder="List name"
        required
        invalid={showError}
        invalidText={showError ? "Title is required" : undefined}
      />
      <Row gap={0.5} justify="flex-end">
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={!canSubmit}
        >
          Save
        </Button>
      </Row>
    </form>
  );
};

export const EventMailingListsPage = () => {
  const { eventId } = useParams();
  const {
    mailingLists,
    loading,
    error,
    createMailingList,
    updateMailingList,
    deleteMailingList,
  } = useMailingLists({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1051 },
  });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);

  const filteredMailingLists = useMemo(
    () => applyMailingListFilters(mailingLists, search, filters),
    [mailingLists, search, filters]
  );

  const hasMailingLists = (mailingLists?.length ?? 0) > 0;
  const hasFilteredMailingLists = filteredMailingLists.length > 0;

  const handleCreate = () => {
    offcanvas({
      title: "Create Mailing List",
      content: (
        <CreateMailingListForm
          onSubmit={async (title) => {
            const success = await createMailingList({ title });
            if (success) close();
            return Boolean(success);
          }}
          onCancel={close}
        />
      ),
    });
  };

  const handleRename = async (list) => {
    offcanvas({
      title: "Rename Mailing List",
      content: (
        <RenameMailingListForm
          mailingList={list}
          onSubmit={async (title) => {
            const trimmed = title?.trim();
            if (!trimmed) {
              return false;
            }
            if (trimmed === list.title) {
              close();
              return true;
            }
            const success = await updateMailingList(list.id, {
              title: trimmed,
            });
            if (success) close();
            return success;
          }}
          onCancel={close}
        />
      ),
    });
  };
  const handleDelete = async (list) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this mailing list?"
    );
    if (!confirmed) return;
    await deleteMailingList(list.id);
  };

  const renderCreateButton = () => (
    <Button variant="primary" onClick={handleCreate}>
      New Mailing List
    </Button>
  );

  let content = null;
  if (error) {
    content = (
      <Typography.Text className="text-danger">
        Failed to load mailing lists. Please try again.
      </Typography.Text>
    );
  } else if (!hasMailingLists) {
    content = (
      <Empty
        title="No mailing lists yet."
        text="Create a list and it will appear here."
        action={renderCreateButton()}
      />
    );
  } else if (!hasFilteredMailingLists) {
    content = (
      <Empty
        title="No mailing lists match your filters."
        text="Try adjusting your search or removing filters."
        action={renderCreateButton()}
      />
    );
  } else {
    content = (
      <div className="table-responsive">
        <Table
          className="card"
          columns={[
            {
              label: "Title",
              accessor: "title",
              render: (value, row) => (
                <Row gap={0.5} align="center">
                  <Link to={`/events/${eventId}/email/lists/${row.id}`}>
                    {value}
                  </Link>
                  {row.crmSavedSegmentId ? (
                    <Badge color="blue" soft>
                      AI
                    </Badge>
                  ) : null}
                </Row>
              ),
            },
            {
              label: "Members",
              accessor: "memberCount",
            },
            {
              label: "Updated",
              accessor: "updatedAt",
              render: (value) => formatDateTime(value),
            },
            {
              label: "Actions",
              accessor: "id",
              render: (value, row) => (
                <Row gap={0.5}>
                  <Button size="sm" onClick={() => handleRename(row)}>
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    style={{ visibility: row.deleted ? "hidden" : "visible" }}
                    onClick={() => handleDelete(row)}
                  >
                    Delete
                  </Button>
                </Row>
              ),
            },
          ]}
          data={filteredMailingLists}
        />
      </div>
    );
  }
  return (
    <EventPage
      title="Mailing Lists"
      description="Review, rename, or delete your mailing lists."
      loading={loading}
    >
      {OffcanvasElement}
      <Row
        justify="space-between"
        align="center"
        gap={1}
        wrap
        style={{ marginBottom: 16 }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <MailingListFilterBar
            search={search}
            setSearch={setSearch}
            filterFieldDefs={MAILING_LIST_FILTER_DEFINITIONS}
            onFiltersChange={setFilters}
          />
        </div>
        {renderCreateButton()}
      </Row>
      {content}
    </EventPage>
  );
};
export default EventMailingListsPage;
