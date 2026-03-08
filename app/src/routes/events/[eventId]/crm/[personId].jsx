import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useCrmPerson } from "../../../../../hooks/useCrmPerson";
import { Button } from "tabler-react-2";
import { Icon } from "../../../../../util/Icon";
import { ActivityCrmPage } from "../../../../../components/ActivityCrmPage/ActivityCrmPage";
import { NotesCrmPage } from "../../../../../components/NotesCrmPage/NotesCrmPage";
import { EmailsCrmPage } from "../../../../../components/EmailsCrmPage/EmailsCrmPage";
import { FinancialCrmPage } from "../../../../../components/FinancialCrmPage/FinancialCrmPage";
import { SettingsCrmPage } from "../../../../../components/SettingsCrmPage/SettingsCrmPage";
import { useCrmLedger } from "../../../../../hooks/useCrmLedger";
import { useCrmPersonInvolvement } from "../../../../../hooks/useCrmPersonInvolvement";
import { CrmPersonHeader } from "../../../../../components/crmPersonPage/CrmPersonHeader";
import { CrmPersonInvolvementTab } from "../../../../../components/crmPersonPage/CrmPersonInvolvementTab";
import { CrmPersonSystemTab } from "../../../../../components/crmPersonPage/CrmPersonSystemTab";
import { CrmPersonWorkspace } from "../../../../../components/crmPersonPage/CrmPersonWorkspace";
import styles from "../../../../../components/crmPersonPage/crmPersonPage.module.css";
import {
  buildInvolvementSummary,
  buildPersonEmailTimeline,
  formatCurrency,
  formatDate,
  getMostRecentTimestamp,
  getPrimaryEmail,
  getPrimaryPhone,
  getSourceLabel,
} from "../../../../../components/crmPersonPage/crmPersonPageUtils";

export const CrmPersonPage = () => {
  const { eventId, personId } = useParams();
  const navigate = useNavigate();
  const { crmPerson, loading } = useCrmPerson({ eventId, personId });
  const emails = useMemo(() => crmPerson?.emails || [], [crmPerson]);
  const { lifetimeValue, ledgerItems } = useCrmLedger({ eventId, personId });
  const { involvement, loading: involvementLoading } = useCrmPersonInvolvement({
    eventId,
    personId,
  });
  const primaryEmail = useMemo(() => getPrimaryEmail(crmPerson), [crmPerson]);
  const primaryPhone = useMemo(() => getPrimaryPhone(crmPerson), [crmPerson]);
  const sourceLabel = useMemo(
    () => getSourceLabel(crmPerson?.source),
    [crmPerson?.source]
  );
  const emailTimeline = useMemo(
    () => buildPersonEmailTimeline(crmPerson),
    [crmPerson]
  );
  const involvementSummary = useMemo(
    () => buildInvolvementSummary(involvement),
    [involvement]
  );
  const lastTouchAt = useMemo(
    () =>
      getMostRecentTimestamp(
        crmPerson?.logs?.map((log) => log.createdAt),
        emailTimeline.map((email) => email.createdAt),
        ledgerItems.map((item) => item.createdAt)
      ),
    [crmPerson?.logs, emailTimeline, ledgerItems]
  );
  const stats = useMemo(
    () => [
      {
        icon: "currency-dollar",
        label: "Lifetime value",
        value: formatCurrency(lifetimeValue),
        helper: `${ledgerItems.length} transaction${
          ledgerItems.length === 1 ? "" : "s"
        }`,
      },
      {
        icon: "mail",
        label: "Messages",
        value: `${emailTimeline.length}`,
        helper: `${emails.length} saved email${emails.length === 1 ? "" : "s"}`,
      },
      {
        icon: "ticket",
        label: "Registrations",
        value: `${crmPerson?.registrations?.length || 0}`,
        helper: `${involvementSummary.participantRegistrations} participant, ${involvementSummary.volunteerRegistrations} volunteer`,
      },
      {
        icon: "building-community",
        label: "Instances",
        value: `${involvementSummary.instanceCount}`,
        helper: `${involvementSummary.volunteerShifts} volunteer shift${
          involvementSummary.volunteerShifts === 1 ? "" : "s"
        }`,
      },
    ],
    [
      crmPerson?.registrations?.length,
      emailTimeline.length,
      emails.length,
      involvementSummary.instanceCount,
      involvementSummary.participantRegistrations,
      involvementSummary.volunteerRegistrations,
      involvementSummary.volunteerShifts,
      ledgerItems.length,
      lifetimeValue,
    ]
  );
  const tabs = useMemo(
    () => [
      {
        title: "Info",
        content: <SettingsCrmPage crmPerson={crmPerson} />,
      },
      {
        title: "Activity",
        content: <ActivityCrmPage crmPerson={crmPerson} />,
      },
      {
        title: "Notes",
        content: <NotesCrmPage crmPerson={crmPerson} />,
      },
      {
        title: "Emails",
        content: <EmailsCrmPage crmPerson={crmPerson} />,
      },
      {
        title: "Financial",
        content: <FinancialCrmPage crmPerson={crmPerson} />,
      },
      {
        title: "Involvement",
        content: (
          <CrmPersonInvolvementTab
            involvement={involvement}
            involvementLoading={involvementLoading}
          />
        ),
      },
      {
        title: "System",
        content: (
          <CrmPersonSystemTab crmPerson={crmPerson} sourceLabel={sourceLabel} />
        ),
      },
    ],
    [crmPerson, involvement, involvementLoading, sourceLabel]
  );

  return (
    <EventPage loading={loading}>
      <div className={styles.pageStack}>
        <div className={styles.backButtonRow}>
          <Button
            size="sm"
            className="p-1"
            onClick={() => navigate(`/events/${eventId}/crm`)}
          >
            <Icon i="arrow-left" /> Back to contacts
          </Button>
        </div>

        <CrmPersonHeader
          crmPerson={crmPerson}
          primaryPhone={primaryPhone}
          stats={stats}
          lastTouchLabel={formatDate(lastTouchAt, "No activity yet")}
        />

        <CrmPersonWorkspace tabs={tabs} />
      </div>
    </EventPage>
  );
};
