import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Input,
  Button,
  Util,
  Timeline,
  Badge,
  useOffcanvas,
  useConfirm,
} from "tabler-react-2";
import moment from "moment";
import { useCrmPerson } from "../../hooks/useCrmPerson";
import { useCrm } from "../../hooks/useCrm";
import { Loading } from "../loading/Loading";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { SystemInfo } from "./SystemInfo";
import { BasicInfo } from "./BasicInfo";
import { useCrmPersons } from "../../hooks/useCrmPersons";
import { FormResponseRUD } from "../formResponseRUD/FormResponseRUD";
import { EmailPreviewPrompt } from "../emailPreview/emailPreview";

// Utilities
const downloadJson = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const screamingSnakeToSentence = (str) => {
  if (!str) return "";
  return str.toLowerCase().split("_").join(" ");
};
export const capitalizeFirstLetter = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Component: CustomFields
export const CustomFields = ({
  crmFields,
  localCrmPerson = {},
  setLocalCrmPerson,
}) => (
  <>
    {crmFields.map((field) => (
      <div key={field.id} className="mb-3">
        <Input
          label={field.label}
          value={localCrmPerson.fields?.[field.id] || ""}
          type={field.type.toLowerCase()}
          onChange={(e) =>
            setLocalCrmPerson({
              ...localCrmPerson,
              fields: { ...localCrmPerson.fields, [field.id]: e },
            })
          }
        />
        <Typography.Text className="form-hint">
          {field.description}
        </Typography.Text>
      </div>
    ))}
  </>
);

// Component: Logs
export const Logs = ({ logs, containerRef }) => {
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1051 },
  });
  const { offcanvas: subOffcanvas, OffcanvasElement: SubOffCanvasElement } =
    useOffcanvas({
      offcanvasProps: { position: "end", size: 440, zIndex: 1051 },
    });
  const { confirm, ConfirmModal } = useConfirm({
    title: "Confirm Title",
    text: "Text",
    commitText: "Commit",
    cancelText: "Cancel",
  });

  // Helper for Logs
  const switchLogForEvent = (log) => {
    switch (log.type) {
      case "CRM_PERSON_CREATED":
        return {
          icon: <Icon i="user-plus" />,
          title: "Created CRM Person",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: (
            <>
              <Typography.Text className="mb-1">
                This CRM person was created
              </Typography.Text>
              <Button
                size="sm"
                onClick={() =>
                  downloadJson(log.data, `crm-person-${log.userId}.json`)
                }
              >
                Download original data (JSON)
              </Button>
            </>
          ),
          iconBgColor: "success",
        };
      case "CRM_PERSON_MODIFIED":
        if (log.changes.length === 0) return null;
        return {
          icon: <Icon i="user-edit" />,
          title: "Updated CRM Person",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          iconBgColor: "primary",
          description: (
            <>
              <Typography.Text className="mb-1">
                This CRM person was updated:
              </Typography.Text>
              <ul>
                {log.changes.map((change) => (
                  <li key={change.path}>
                    <Row gap={1} wrap>
                      {capitalizeFirstLetter(change.path)}
                      <Badge soft color="danger">
                        {change.from}
                      </Badge>
                      <Icon i="arrow-right" />
                      <Badge soft color="success">
                        {change.to}
                      </Badge>
                    </Row>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                className="mt-2"
                onClick={() =>
                  downloadJson(log.data.before, `crm-person-${log.userId}.json`)
                }
              >
                Download data before this change (JSON)
              </Button>
            </>
          ),
        };
      case "CRM_PERSON_DELETED":
        return {
          icon: <Icon i="user-x" />,
          title: "Deleted CRM Person",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: "This CRM person was deleted.",
          iconBgColor: "danger",
        };
      case "FORM_RESPONSE_CREATED":
        return {
          icon: <Icon i="message" />,
          title: "Volunteer Form Response Created",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: (
            <>
              <Typography.Text className="mb-1">
                This person submitted a volunteer form response.
              </Typography.Text>
              <Button
                size="sm"
                onClick={() => {
                  containerRef.current.parentElement.parentElement.scrollTo({
                    top: 0,
                  });

                  offcanvas({
                    content: (
                      <FormResponseRUD
                        id={log.formResponseId}
                        subOffcanvas={subOffcanvas}
                        confirm={confirm}
                      />
                    ),
                  });
                }}
              >
                View CRM Person
              </Button>
            </>
          ),
          iconBgColor: "success",
        };
      case "EMAIL_WEBHOOK_OPEN":
        return {
          icon: <Icon i="message" />,
          title: "Email Opened",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: (
            <>
              <Typography.Text className="mb-1">
                An email was opened.
              </Typography.Text>
              <EmailPreviewPrompt emailId={log.emailId} />
            </>
          ),
          iconBgColor: "success",
        };
      case "EMAIL_WEBHOOK_DELIVERY":
        return {
          icon: <Icon i="message" />,
          title: "Email Delivered",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: (
            <>
              <Typography.Text className="mb-1">
                An email was delivered.
              </Typography.Text>
              <EmailPreviewPrompt emailId={log.emailId} />
            </>
          ),
          iconBgColor: "success",
        };
      case "EMAIL_SENT":
        return {
          icon: <Icon i="message" />,
          title: "Email Sent",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: (
            <>
              <Typography.Text className="mb-1">
                An email was sent to this person.
              </Typography.Text>
              <EmailPreviewPrompt emailId={log.emailId} />
            </>
          ),
          iconBgColor: "success",
        };
      case "EMAIL_WEBHOOK_RECEIVED":
        return {
          icon: <Icon i="message" />,
          title: "Email Received",
          time: moment(log.createdAt).format("M/DD/YYYY h:mm a"),
          description: (
            <>
              <Typography.Text className="mb-1">
                This person sent an email handled by EventPilot.
              </Typography.Text>
              <EmailPreviewPrompt emailId={log.inboundEmailId} />
            </>
          ),
          iconBgColor: "success",
        };
      default:
        return { icon: <Icon i="message" />, title: log.type };
    }
  };

  return (
    <>
      {OffcanvasElement}
      {SubOffCanvasElement}
      {ConfirmModal}
      <Timeline
        dense
        events={logs.map(switchLogForEvent).filter(Boolean)}
        offcanvas={offcanvas}
        subOffcanvas={subOffcanvas}
      />
    </>
  );
};

// Main Component: CrmPersonCRUD
export const CrmPersonCRUD = ({
  crmPersonId,
  onClose,
  showDeleteButton = true,
}) => {
  const { eventId } = useParams();
  const { crmFields, loading: fieldsLoading } = useCrm({ eventId });
  const {
    crmPerson,
    loading,
    updateCrmPerson,
    mutationLoading,
    deleteCrmPerson,
    DeleteConfirmElement,
  } = useCrmPerson({
    eventId,
    personId: crmPersonId,
  });
  const {
    createCrmPerson,
    loading: createLoading,
    mutationLoading: createMutationLoading,
  } = useCrmPersons({ eventId });

  const [localCrmPerson, setLocalCrmPerson] = useState(crmPerson);

  useEffect(() => {
    setLocalCrmPerson(crmPerson);
  }, [crmPerson]);

  const handleSubmit = async () => {
    const payload = { ...localCrmPerson };
    // Process emails: filter and map to { id, email }
    payload.emails = payload.emails
      .filter((e) => e.email?.length > 0)
      .map((e) => ({ ...e, id: e.id, email: e.email }));

    // Process phones: filter and map to { id, phone }
    payload.phones = payload.phones
      .filter((p) => p.phone?.length > 0)
      .map((p) => ({ ...p, id: p.id, phone: p.phone }));

    payload.fields = Object.entries(payload.fields).map(([id, value]) => ({
      id,
      value,
    }));

    if (crmPerson?.id) {
      await updateCrmPerson(payload);
    } else {
      await createCrmPerson(payload);
    }
  };

  const handleDelete = async () => {
    if (await deleteCrmPerson()) {
      onClose?.();
    }
  };

  const containerRef = useRef(null);

  if (fieldsLoading || loading) {
    return <Loading />;
  }

  return (
    <div style={{ marginBottom: 100 }} ref={containerRef}>
      {DeleteConfirmElement}
      <Typography.H5 className="mb-0 text-secondary">CONTACT</Typography.H5>
      <Typography.H1>{localCrmPerson?.name || "New Contact"}</Typography.H1>
      <Util.Hr text="Basic Info" />
      <BasicInfo
        localCrmPerson={localCrmPerson}
        setLocalCrmPerson={setLocalCrmPerson}
      />

      <Util.Hr text="Custom Fields" />
      <CustomFields
        crmFields={crmFields}
        localCrmPerson={localCrmPerson}
        setLocalCrmPerson={setLocalCrmPerson}
      />

      <Util.Hr text="Operations" />
      <Row gap={1} align="center">
        <Button
          onClick={handleSubmit}
          loading={mutationLoading}
          variant="primary"
        >
          Save
        </Button>
        {showDeleteButton && (
          <Button
            onClick={handleDelete}
            loading={mutationLoading}
            outline
            variant="danger"
          >
            Delete
          </Button>
        )}
      </Row>

      {localCrmPerson?.id && (
        <>
          {/* <Util.Hr text="Logs" />
          <Logs logs={crmPerson.logs} containerRef={containerRef} /> */}
          <Util.Hr text="System Info" />
          <SystemInfo crmPerson={crmPerson} />
        </>
      )}
    </div>
  );
};
