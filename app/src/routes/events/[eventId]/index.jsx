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

  const {
    eventStart,
    progress,
    volunteerRegistrationCount,
    volunteerRegistrationByDay,
    jobCount,
    locationCount,
    shiftCount,
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
      <Typography.H2>
        {progress?.percent === 100 ? "Getting Started" : "Remaining Steps"}
      </Typography.H2>
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          alignItems: "stretch",
          gap: 10,
        }}
      >
        {progress?.percent === 100 ? (
          <>
            <Card
              style={{
                maxWidth: 300,
                minWidth: 250,
                display: "inline-block",
                marginRight: 10,
                whiteSpace: "normal",
              }}
            >
              <Typography.H5 className={"mb-1 text-secondary"}>
                AN EASY, INSTANT WEBSITE
              </Typography.H5>
              <Typography.Text>
                Your event's website is automatically generated from your
                event's data. We merge locations & timing, common links, images,
                and contact information.
              </Typography.Text>
              <Typography.Text>
                <a
                  href={`https://${event.slug}.geteventpilot.com`}
                  target="_blank"
                >
                  https://{event.slug}.geteventpilot.com
                </a>
              </Typography.Text>
            </Card>
            <Card
              style={{
                maxWidth: 350,
                minWidth: 250,
                display: "inline-block",
                marginRight: 10,
                whiteSpace: "normal",
              }}
            >
              <Typography.H5 className={"mb-1 text-secondary"}>
                VOLUNTEER REGISTRATIONS
              </Typography.H5>
              <Typography.Text>
                EventPilot combines required fields, event{" "}
                <Link to="./volunteers/jobs">timing details</Link>, and your{" "}
                <Link to="./volunteers/builder">custom fields</Link> into one
                simple form. Share it with volunteers to collect signups easily.
              </Typography.Text>
              <Typography.Text>
                <a
                  href={`https://${event.slug}.geteventpilot.com/volunteer`}
                  target="_blank"
                >
                  https://{event.slug}.geteventpilot.com/volunteer
                </a>
              </Typography.Text>
            </Card>
          </>
        ) : (
          <ProgressRow />
        )}
      </div>
      <Util.Hr />
      <SelectedInstanceCard />
    </EventPage>
  );
};
