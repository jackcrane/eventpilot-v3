import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useCrmPerson } from "../../../../../hooks/useCrmPerson";
import { Button, Typography, Util, Badge, Card } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { Icon } from "../../../../../util/Icon";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";
import { useSelectedInstance } from "../../../../../contexts/SelectedInstanceContext";
import classNames from "classnames";
import tabsStyles from "./CrmPersonTabs.module.css";
import { ActivityCrmPage } from "../../../../../components/ActivityCrmPage/ActivityCrmPage";
import { NotesCrmPage } from "../../../../../components/NotesCrmPage/NotesCrmPage";
import { EmailsCrmPage } from "../../../../../components/EmailsCrmPage/EmailsCrmPage";
import { FinancialCrmPage } from "../../../../../components/FinancialCrmPage/FinancialCrmPage";
import { SettingsCrmPage } from "../../../../../components/SettingsCrmPage/SettingsCrmPage";
import { useCrmLedger } from "../../../../../hooks/useCrmLedger";
import { useCrmPersonInvolvement } from "../../../../../hooks/useCrmPersonInvolvement";

export const CrmPersonPage = () => {
  const { eventId, personId } = useParams();
  const navigate = useNavigate();
  const { crmPerson, loading } = useCrmPerson({ eventId, personId });
  const { setInstance } = useSelectedInstance();

  const [tab, setTab] = useState({ id: "activity" });

  const emails = useMemo(() => crmPerson?.emails || [], [crmPerson]);
  const phones = useMemo(() => crmPerson?.phones || [], [crmPerson]);
  const { lifetimeValue } = useCrmLedger({ eventId, personId });
  const { involvement, loading: involvementLoading } = useCrmPersonInvolvement({
    eventId,
    personId,
  });
  const formattedLTV = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(lifetimeValue || 0));

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
                <Typography.Text className="text-muted mb-0">
                  Source:
                </Typography.Text>
                <Badge outline>{crmPerson.source}</Badge>
              </Row>
            )}
            <Util.Hr text="Lifetime Value" />
            <Row gap={0.5} align="center" className="mb-2">
              <Icon i="currency-dollar" />
              <Typography.H3 className="mb-0">{formattedLTV}</Typography.H3>
            </Row>
            <Util.Hr text="Emails" />
            {emails.length ? (
              <Col gap={0.5} align="flex-start">
                {emails.map((e) => (
                  <Row key={e.id || e.email} gap={0.5} align="center">
                    <Icon i="mail" />
                    <span>{e.email}</span>
                    {e.label && <Badge soft>{e.label}</Badge>}
                  </Row>
                ))}
              </Col>
            ) : (
              <Typography.Text className="text-muted">
                No emails
              </Typography.Text>
            )}
            <Util.Hr text="Phones" />
            {phones.length ? (
              <Col gap={0.5} align="flex-start">
                {phones.map((p) => (
                  <Row key={p.id || p.phone} gap={0.5} align="center">
                    <Icon i="phone" />
                    <span>{p.phone}</span>
                    {p.label && <Badge soft>{p.label}</Badge>}
                  </Row>
                ))}
              </Col>
            ) : (
              <Typography.Text className="text-muted">
                No phones
              </Typography.Text>
            )}
          </div>
        }
        centerIcon="users"
        // centerTitle={
        //   <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
        //     <span>Contact</span>
        //     <span className={classNames(tabsStyles.tabsInline)}>
        //       <button
        //         type="button"
        //         onClick={() => setTab({ id: "activity" })}
        //         className={classNames(
        //           tabsStyles.button,
        //           tab.id === "activity" && tabsStyles.active
        //         )}
        //       >
        //         <Row gap={0.5} align="center">
        //           <Icon i="activity" size={16} />
        //           <span>Activity</span>
        //         </Row>
        //       </button>
        //       <button
        //         type="button"
        //         onClick={() => setTab({ id: "notes" })}
        //         className={classNames(
        //           tabsStyles.button,
        //           tab.id === "notes" && tabsStyles.active
        //         )}
        //       >
        //         <Row gap={0.5} align="center">
        //           <Icon i="notes" size={16} />
        //           <span>Notes</span>
        //         </Row>
        //       </button>
        //       <button
        //         type="button"
        //         onClick={() => setTab({ id: "emails" })}
        //         className={classNames(
        //           tabsStyles.button,
        //           tab.id === "emails" && tabsStyles.active
        //         )}
        //       >
        //         <Row gap={0.5} align="center">
        //           <Icon i="mail" size={16} />
        //           <span>Emails</span>
        //         </Row>
        //       </button>
        //       <button
        //         type="button"
        //         onClick={() => setTab({ id: "financial" })}
        //         className={classNames(
        //           tabsStyles.button,
        //           tab.id === "financial" && tabsStyles.active
        //         )}
        //       >
        //         <Row gap={0.5} align="center">
        //           <Icon i="currency-dollar" size={16} />
        //           <span>Financial</span>
        //         </Row>
        //       </button>
        //     </span>
        //   </span>
        // }
        // centerChildren={
        //   <div>
        //     {tab.id === "activity" && (
        //       <div>
        //         <Typography.H3>Activity</Typography.H3>
        //         <Typography.Text>
        //           Logs and activity will appear here.
        //         </Typography.Text>
        //       </div>
        //     )}
        //     {tab.id === "notes" && (
        //       <div>
        //         <Typography.H3>Notes</Typography.H3>
        //         <Typography.Text>
        //           Notes about this contact will appear here.
        //         </Typography.Text>
        //       </div>
        //     )}
        //     {tab.id === "emails" && (
        //       <div>
        //         <Typography.H3>Emails</Typography.H3>
        //         <Typography.Text>
        //           Email threads and messages will appear here.
        //         </Typography.Text>
        //       </div>
        //     )}
        //     {tab.id === "financial" && (
        //       <div>
        //         <Typography.H3>Financial</Typography.H3>
        //         <Typography.Text>
        //           Financial details and transactions will appear here.
        //         </Typography.Text>
        //       </div>
        //     )}
        //   </div>
        // }
        centerTabs={[
          {
            title: "Activity",
            icon: "activity",
            content: <ActivityCrmPage crmPerson={crmPerson} />,
          },
          {
            title: "Notes",
            icon: "notes",
            content: <NotesCrmPage crmPerson={crmPerson} />,
          },
          {
            title: "Emails",
            icon: "mail",
            content: <EmailsCrmPage crmPerson={crmPerson} />,
          },
          {
            title: "Financial",
            icon: "currency-dollar",
            content: <FinancialCrmPage crmPerson={crmPerson} />,
          },
          {
            title: "Settings",
            icon: "settings",
            content: <SettingsCrmPage crmPerson={crmPerson} />,
          },
        ]}
        rightIcon="hand-stop"
        rightTitle="Involvement"
        rightChildren={
          <div>
            <Typography.H3>Involvement</Typography.H3>
            <Typography.Text className="text-muted">
              Volunteer and participant activity by instance.
            </Typography.Text>
            <Util.Hr />
            <Col gap={1} align="flex-start" justify="flex-start">
              {(involvementLoading || loading) && (
                <Typography.Text className="text-muted">
                  Loading…
                </Typography.Text>
              )}
              {!involvementLoading && involvement?.length === 0 && (
                <Typography.Text className="text-muted">
                  No involvement found.
                </Typography.Text>
              )}
              {involvement?.map((inst) => {
                const vCount = inst?.volunteer?.registrations?.length || 0;
                const vShifts = inst?.volunteer?.shiftCount || 0;
                const pRegs = inst?.participant?.registrations || [];
                const pCount = pRegs.length;
                const pTiers = Array.from(
                  new Set(pRegs.map((r) => r.tierName).filter(Boolean))
                );
                const showVolunteer = vCount > 0 && vShifts > 0;
                const showParticipant = pCount > 0; // hide if not a participant
                if (!showVolunteer && !showParticipant) return null;
                return (
                  <div key={inst.instance.id} style={{ width: "100%" }}>
                    <Typography.H4 className="mb-1">
                      {inst.instance.name}
                    </Typography.H4>
                    <Card className="mb-2" style={{ width: "100%" }}>
                      <Col gap={0.5} align="flex-start" justify="flex-start">
                        {showVolunteer && (
                          <Row gap={0.5} align="center">
                            <Icon i="heart" color="var(--tblr-danger)" />
                            <Typography.Text className="mb-0">
                              {vShifts} shift{vShifts === 1 ? "" : "s"} across{" "}
                              {vCount} registration{vCount === 1 ? "" : "s"}
                            </Typography.Text>
                          </Row>
                        )}
                        {showParticipant && (
                          <Row gap={0.5} align="center">
                            <Icon i="ticket" color="var(--tblr-primary)" />
                            <Typography.Text className="mb-0">
                              {pCount} registration{pCount === 1 ? "" : "s"}
                              {pTiers.length ? ` • ${pTiers.join(", ")}` : ""}
                            </Typography.Text>
                            <Typography.Link
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setInstance(inst.instance.id);
                                navigate(
                                  `/events/${eventId}/registration/registrations`
                                );
                              }}
                              style={{ marginLeft: 8 }}
                            >
                              View registrations <Icon i="arrow-right" />
                            </Typography.Link>
                          </Row>
                        )}
                      </Col>
                    </Card>
                  </div>
                );
              })}
            </Col>
          </div>
        }
      />
    </EventPage>
  );
};
