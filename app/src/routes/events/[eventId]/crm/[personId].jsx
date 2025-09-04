import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useCrmPerson } from "../../../../../hooks/useCrmPerson";
import { Button, Typography, SegmentedControl, Util, Badge } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { Icon } from "../../../../../util/Icon";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";

export const CrmPersonPage = () => {
  const { eventId, personId } = useParams();
  const navigate = useNavigate();
  const { crmPerson, loading } = useCrmPerson({ eventId, personId });

  const [tab, setTab] = useState({ id: "activity" });

  const emails = useMemo(() => crmPerson?.emails || [], [crmPerson]);
  const phones = useMemo(() => crmPerson?.phones || [], [crmPerson]);

  return (
    <EventPage loading={loading}>
      <Row gap={1} className="mb-2">
        <Button
          size="sm"
          className="p-1"
          onClick={() => navigate(`/events/${eventId}/crm`)}
        >
          <Icon i="arrow-left" /> Back to contacts
        </Button>
      </Row>

      <TriPanelLayout
        leftIcon="id-badge-2"
        leftTitle="Basic Info"
        leftChildren={
          <div>
            <Typography.H2 className="mb-1">
              {crmPerson?.name || "Contact"}
            </Typography.H2>
            {crmPerson?.source && (
              <Row gap={0.5} align="center" className="mb-2">
                <Typography.Text className="text-muted mb-0">Source:</Typography.Text>
                <Badge outline>{crmPerson.source}</Badge>
              </Row>
            )}
            <Util.Hr text="Emails" />
            {emails.length ? (
              <Col gap={0.5}>
                {emails.map((e) => (
                  <Row key={e.id || e.email} gap={0.5} align="center">
                    <Icon i="mail" />
                    <span>{e.email}</span>
                    {e.label && <Badge soft>{e.label}</Badge>}
                  </Row>
                ))}
              </Col>
            ) : (
              <Typography.Text className="text-muted">No emails</Typography.Text>
            )}
            <Util.Hr text="Phones" />
            {phones.length ? (
              <Col gap={0.5}>
                {phones.map((p) => (
                  <Row key={p.id || p.phone} gap={0.5} align="center">
                    <Icon i="phone" />
                    <span>{p.phone}</span>
                    {p.label && <Badge soft>{p.label}</Badge>}
                  </Row>
                ))}
              </Col>
            ) : (
              <Typography.Text className="text-muted">No phones</Typography.Text>
            )}
          </div>
        }
        centerIcon="users"
        centerTitle={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>Contact</span>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              items={[
                { id: "activity", label: "Activity" },
                { id: "notes", label: "Notes" },
                { id: "emails", label: "Emails" },
                { id: "financial", label: "Financial" },
              ]}
              size="sm"
            />
          </div>
        }
        centerChildren={
          <div>
            {tab.id === "activity" && (
              <div>
                <Typography.H3>Activity</Typography.H3>
                <Typography.Text>
                  Logs and activity will appear here.
                </Typography.Text>
              </div>
            )}
            {tab.id === "notes" && (
              <div>
                <Typography.H3>Notes</Typography.H3>
                <Typography.Text>
                  Notes about this contact will appear here.
                </Typography.Text>
              </div>
            )}
            {tab.id === "emails" && (
              <div>
                <Typography.H3>Emails</Typography.H3>
                <Typography.Text>
                  Email threads and messages will appear here.
                </Typography.Text>
              </div>
            )}
            {tab.id === "financial" && (
              <div>
                <Typography.H3>Financial</Typography.H3>
                <Typography.Text>
                  Financial details and transactions will appear here.
                </Typography.Text>
              </div>
            )}
          </div>
        }
        rightIcon="hand-stop"
        rightTitle="Involvement"
        rightChildren={
          <div>
            <Typography.H3>Involvement</Typography.H3>
            <Typography.Text className="text-muted">
              Participation details (e.g., volunteer roles, registrations) will appear here.
            </Typography.Text>
            <Util.Hr />
            <Col gap={0.5}>
              <Row gap={0.5} align="center">
                <Icon i="heart" /> Volunteer: <em>Not loaded</em>
              </Row>
              <Row gap={0.5} align="center">
                <Icon i="ticket" /> Participant: <em>Not loaded</em>
              </Row>
              <Row gap={0.5} align="center">
                <Icon i="user" /> Other: <em>Not loaded</em>
              </Row>
            </Col>
          </div>
        }
      />
    </EventPage>
  );
};
