import { Link, useParams } from "react-router-dom";
import { Page } from "../../../../components/page/Page";
import { useEvent } from "../../../../hooks/useEvent";
import {
  Card,
  Typography,
  Spinner,
  Button,
  EnclosedSelectGroup,
  Util,
  Alert,
} from "tabler-react-2";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { Row } from "../../../../util/Flex";
import { useDashboardData } from "../../../../hooks/useDashboardData";
import moment from "moment";
import { TimeLineChart } from "../../../../components/plots/timeline";
import styled from "styled-components";
import { DataBox } from "../../../../components/dataBox/DataBox";
import { useLocations } from "../../../../hooks/useLocations";
import { TodoList } from "../../../../components/todoList/TodoList";
import { WhatNext } from "../../../../components/whatNext/WhatNext";
import { useTourManager } from "../../../../components/tourManager/TourManager";
import { useSelectedInstance } from "../../../../contexts/SelectedInstanceContext";
import { SelectedInstanceCard } from "../../../../components/InstanceCard/InstanceCard";
import { ProgressRow } from "../../../../components/Progress/ProgressRow";
import { Icon } from "../../../../util/Icon";
import { VolunteerRegistrationStatsCard } from "../../../../components/VolunteerRegistrationStatsCard/VolunteerRegistrationStatsCard";
import { ParticipantRegistrationStatsCard } from "../../../../components/ParticipantRegistrationStatsCard/ParticipantRegistrationStatsCard";
import { useDbState } from "../../../../hooks/useDbState";
import { LedgerSummaryCard } from "../../../../components/LedgerSummaryCard/LedgerSummaryCard";

const Divider = styled.div`
  background-color: var(--tblr-card-border-color);
  min-width: 2px;
  height: 150px;
  align-self: center;
`;

export const Event = () => {
  const { eventId } = useParams();
  const { event, loading, error, refetch } = useEvent({ eventId });
  const { startTour } = useTourManager();
  const [remainingOpen, setRemainingOpen] = useDbState(true, "remainingStepsOpen");

  const {
    eventStart,
    progress,
    volunteerRegistrationCount,
    volunteerRegistrationByDay,
    jobCount,
    locationCount,
    shiftCount,
    volunteerRegistrationEnabled,
    registrationEnabled,
    loading: loadingDash,
  } = useDashboardData(eventId);

  const days = moment(eventStart).diff(moment(), "days");

  if (loading)
    return (
      <EventPage title="Event" loading={loading}>
        <Typography.Text>Loading...</Typography.Text>
      </EventPage>
    );

  return (
    <EventPage
      title="Event"
      tour={() => startTour("event_home")}
      description={
        "This is your event homepage. As more starts to happen in your event, you will see analytics and prompts here to help you keep track of what is happening."
      }
    >
      <Row align="center" style={{ gap: 8 }} className="mb-3">
        <Typography.H2 style={{ margin: 0 }}>Remaining Steps</Typography.H2>
        <Button
          ghost
          variant="secondary"
          size="sm"
          aria-expanded={remainingOpen}
          aria-controls="remaining-steps-section"
          onClick={() => setRemainingOpen((v) => !v)}
        >
          <Icon i={remainingOpen ? "chevron-up" : "chevron-down"} size={18} />
          {remainingOpen ? "Hide" : "Show"}
        </Button>
      </Row>
      <div
        id="remaining-steps-section"
        style={{
          overflow: "hidden",
          transition: "max-height 300ms ease, opacity 200ms ease",
          maxHeight: remainingOpen ? 500 : 0,
          opacity: remainingOpen ? 1 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            overflowX: "auto",
            alignItems: "stretch",
            gap: 10,
          }}
        >
          <ProgressRow />
        </div>
      </div>
      {!volunteerRegistrationEnabled ? (
        <Alert
          variant="danger"
          className="mt-3"
          title="Volunteer Registration is not enabled"
        >
          Volunteers are not able to register for this event because you have
          not fully configured the required sections. Please see the steps above
          to set up your event.
        </Alert>
      ) : (
        <Alert
          variant="success"
          className="mt-3"
          title="Volunteer Registration is enabled & open"
        >
          Your event is fully configured for volunteer registration.
        </Alert>
      )}
      {!registrationEnabled ? (
        <Alert
          variant="danger"
          className="mt-3"
          title="Participant Registration is not enabled"
        >
          Participants are not able to register for this event because you have
          not fully configured the required sections. Please see the steps above
          to set up your event.
        </Alert>
      ) : (
        <Alert
          variant="success"
          className="mt-3"
          title="Participant Registration is enabled & open"
        >
          Your event is fully configured for participant registration.
        </Alert>
      )}
      <Util.Hr />
      {/* Ledger summary row */}
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          alignItems: "stretch",
          gap: 10,
        }}
        className="mt-2 mb-3"
      >
        <LedgerSummaryCard />
      </div>
      <VolunteerRegistrationStatsCard />
      <div className="mt-3">
        <ParticipantRegistrationStatsCard />
      </div>
    </EventPage>
  );
};
