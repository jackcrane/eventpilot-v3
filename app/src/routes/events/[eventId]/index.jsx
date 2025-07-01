import { useParams } from "react-router-dom";
import { Page } from "../../../../components/page/Page";
import { useEvent } from "../../../../hooks/useEvent";
import {
  Card,
  Typography,
  Spinner,
  Button,
  EnclosedSelectGroup,
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
      <Page title="Event">
        <Typography.Text>Loading...</Typography.Text>
      </Page>
    );

  return (
    <EventPage title="Event" tour={() => startTour("event_home")}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridGap: "1rem",
        }}
      >
        <Card title="Progress" style={{ gridColumn: "2/4" }}>
          <Row gap={2} align="flex-start">
            {/* <div>
              <Typography.H5 className={"mb-1 text-secondary"}>
                OVERALL PROGRESS
              </Typography.H5>
              <Typography.Text>
                The overall progress of your event is measured by your progress
                setting up EventPilot to run your event.
              </Typography.Text>
              <Row gap={1} align="flex-end">
                <Typography.Text style={{ fontSize: "2rem" }} className="mb-0">
                  {progress?.percent ? `${progress?.percent}%` : <Spinner />}
                </Typography.Text>
                <span className="text-muted mb-2">
                  {progress?.completedSteps} of {progress?.totalSteps} steps
                  completed
                </span>
              </Row>
              <div className="progress mb-3">
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${progress?.percent || 0}%` }}
                  aria-valuenow={progress?.percent || 0}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
            <Divider /> */}
            <div>
              <Typography.H5 className={"mb-1 text-secondary"}>
                EVENT STARTS
              </Typography.H5>
              <Typography.Text>
                We know you are excited for your event, so we are counting down
                the days for you!
              </Typography.Text>
              <Typography.Text style={{ fontSize: "2rem" }} className="mb-0">
                {eventStart === null ? (
                  <>
                    <Typography.Text
                      className="text-secondary"
                      style={{ fontSize: "initial" }}
                    >
                      You haven't set an event start date yet. We pull the start
                      date from the start of the first location.
                    </Typography.Text>
                  </>
                ) : (
                  <>
                    {days > 0 && (
                      <span
                        className={"text-secondary"}
                        style={{ fontSize: "1rem", marginRight: 8 }}
                      >
                        T-minus
                      </span>
                    )}
                    {days > 1
                      ? `${days} days`
                      : days === 1
                      ? "1 day"
                      : "Today!"}
                  </>
                )}
              </Typography.Text>
            </div>
            <Divider />
            <div>
              <Typography.H5 className={"mb-1 text-secondary"}>
                VOLUNTEERS
              </Typography.H5>
              <Typography.Text>
                Every good event needs good volunteers. We are tracking the
                number of volunteers who have registered for your event for you.
              </Typography.Text>
              <Row gap={1} justify="space-between">
                <div>
                  <Typography.Text
                    style={{ fontSize: "2rem" }}
                    className="mb-0"
                  >
                    {volunteerRegistrationCount}
                    <span className="text-secondary">
                      {" "}
                      volunteer
                      {volunteerRegistrationCount !== 1 && "s"}
                    </span>
                  </Typography.Text>
                  <Button
                    size="sm"
                    href={`http://${event.slug}.geteventpilot.com`}
                    target="_blank"
                  >
                    Open Registration Page
                  </Button>
                </div>
              </Row>
            </div>
          </Row>
        </Card>

        <Card
          title="What to do next"
          style={{ gridRow: "1/3" }}
          variant="primary"
          className="tour__todo-list"
        >
          <WhatNext />
        </Card>

        <Card title="Volunteer Registrations">
          {volunteerRegistrationByDay?.length === 0 && (
            <Typography.Text>
              You don't have any volunteers registered yet.
            </Typography.Text>
          )}
          <TimeLineChart
            ghost
            data={volunteerRegistrationByDay?.map((d) => ({
              ...d,
              date: new Date(d.date),
            }))}
            width={400}
            height={200}
          />
        </Card>
        <Card title="Event Setup">
          <Row gap={1} wrap>
            <DataBox title="Locations" value={locationCount} />
            <DataBox title="Jobs" value={jobCount} />
            <DataBox title="Shifts" value={shiftCount} />
          </Row>
        </Card>
        {/* <Card title="To-Do List">
          <TodoList />
        </Card> */}
      </div>
    </EventPage>
  );
};
