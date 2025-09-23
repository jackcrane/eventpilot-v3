import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Table, Button, Typography, Input, useOffcanvas, Dropdown } from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useMailingLists } from "../../../../../../hooks/useMailingLists";
import { MailingListAddPeoplePanel } from "../../../../../../components/crm/MailingListAddPeoplePanel";

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
  const { mailingLists, loading, error, updateMailingList, deleteMailingList } =
    useMailingLists({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1051 },
  });

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
  const handleAddPeople = (list) => {
    offcanvas({
      title: "Add people",
      content: (
        <MailingListAddPeoplePanel
          eventId={eventId}
          mailingListId={list.id}
          mailingListTitle={list.title}
          onClose={close}
        />
      ),
    });
  };
  return (
    <EventPage
      title="Mailing Lists"
      description="Review, rename, or delete your mailing lists."
      loading={loading}
    >
      {OffcanvasElement}
      {error ? (
        <Typography.Text className="text-danger">
          Failed to load mailing lists. Please try again.
        </Typography.Text>
      ) : mailingLists?.length ? (
        <div className="table-responsive">
          <Table
            className="card"
            columns={[
              {
                label: "Title",
                accessor: "title",
                render: (value, row) => (
                  <Link to={`/events/${eventId}/email/lists/${row.id}`}>
                    {value}
                  </Link>
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
                    <Button
                      size="sm"
                      onClick={() => handleRename(row)}
                    >
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
                    <Dropdown
                      prompt="Actions"
                      items={[
                        {
                          text: "Add people",
                          onclick: () => handleAddPeople(row),
                        },
                        {
                          text: "Rename",
                          onclick: () => handleRename(row),
                        },
                        {
                          text: "Delete",
                          onclick: () => handleDelete(row),
                        },
                      ]}
                    />
                  </Row>
                ),
              },
            ]}
            data={mailingLists}
          />
        </div>
      ) : (
        <Empty
          title="No mailing lists yet."
          text="Create a list and it will appear here."
        />
      )}
    </EventPage>
  );
};
export default EventMailingListsPage;
