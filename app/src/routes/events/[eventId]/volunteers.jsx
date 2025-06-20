import React from "react";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useFormResponses } from "../../../../hooks/useFormResponses";
import { useParams } from "react-router-dom";
import { Table, Button, useOffcanvas, useConfirm } from "tabler-react-2";
import { FIELD_TYPES } from "../../../../components/formBuilder/FormBuilder";
import { Icon } from "../../../../util/Icon";
import { Row } from "../../../../util/Flex";
import { FormResponseRUD } from "../../../../components/formResponseRUD/FormResponseRUD";

const renderCell = (f, v) => {
  switch (f.type) {
    case "dropdown":
      return v?.label;
    default:
      return v;
  }
};

const renderTitle = (f) => {
  return (
    <>
      <Icon size={12} i={FIELD_TYPES.find((t) => t.type === f.type).icon} />{" "}
      {f.label}
      {f.required && <span style={{ color: "red" }}>*</span>}
    </>
  );
};

export const EventVolunteers = () => {
  const { eventId } = useParams();
  const { responses, fields } = useFormResponses(eventId);
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });
  const { confirm, ConfirmModal } = useConfirm({
    title: "Confirm Title",
    text: "Text",
    commitText: "Commit",
    cancelText: "Cancel",
  });

  return (
    <EventPage title="Volunteers">
      {OffcanvasElement}
      {ConfirmModal}
      <Table
        className="card"
        columns={[
          {
            label: "Details",
            accessor: "id",
            render: (v) => (
              <Button
                size="sm"
                onClick={() =>
                  offcanvas({
                    content: <FormResponseRUD id={v} confirm={confirm} />,
                  })
                }
              >
                View
              </Button>
            ),
          },
          ...fields.map((f) => ({
            label: renderTitle(f),
            accessor: f.id,
            render: (v) => renderCell(f, v),
          })),
        ]}
        data={responses}
        rowKey="id"
      />
    </EventPage>
  );
};
