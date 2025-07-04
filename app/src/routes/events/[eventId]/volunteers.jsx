import React from "react";
import { useFormResponses } from "../../../../hooks/useFormResponses";
import { useNavigate, useParams } from "react-router-dom";
import { Table, Button, useOffcanvas, useConfirm } from "tabler-react-2";
import { FIELD_TYPES } from "../../../../components/formBuilder/FormBuilder";
import { Icon } from "../../../../util/Icon";
import { Row } from "../../../../util/Flex";
import { FormResponseRUD } from "../../../../components/formResponseRUD/FormResponseRUD";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { Empty } from "../../../../components/empty/Empty";
import { useEvent } from "../../../../hooks/useEvent";
import { Loading } from "../../../../components/loading/Loading";

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
  const { responses, fields, loading } = useFormResponses(eventId);
  const { event } = useEvent({ eventId });
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1050 },
  });
  const { offcanvas: subOffcanvas, OffcanvasElement: SubOffcanvasElement } =
    useOffcanvas({
      offcanvasProps: { position: "end", size: 470, zIndex: 1051 },
    });
  const { confirm, ConfirmModal } = useConfirm({
    title: "Confirm Title",
    text: "Text",
    commitText: "Commit",
    cancelText: "Cancel",
  });

  return (
    <EventPage
      title="Volunteers"
      loading={loading}
      description={
        "This is the volunteers roster. It is a list of all the volunteers who are registered to volunteer for your event."
      }
    >
      {ConfirmModal}
      {OffcanvasElement}
      {SubOffcanvasElement}
      {responses.length === 0 ? (
        <>
          <Empty
            title="No volunteers yet"
            text="You haven't had any volunteers register yet. Be sure you have your registration form built and ready to go."
            ctaText="Open Volunteer Registration Page"
            onCtaClick={() =>
              window.open(`https://${event?.slug}.geteventpilot.com`, "_blank")
            }
            ctaIcon="heart"
            gradient={false}
          />
        </>
      ) : (
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
                      content: (
                        <FormResponseRUD
                          id={v}
                          confirm={confirm}
                          subOffcanvas={subOffcanvas}
                        />
                      ),
                    })
                  }
                >
                  <Icon i="info-circle" /> Details
                </Button>
              ),
            },
            ...fields
              .filter((f) => f.currentlyInForm)
              .map((f) => ({
                label: renderTitle(f),
                accessor: f.id,
                render: (v) => renderCell(f, v),
              })),
          ]}
          data={responses}
        />
      )}
    </EventPage>
  );
};
