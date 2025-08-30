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
      <Typography.H2>Getting Started</Typography.H2>
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          alignItems: "stretch",
        }}
      >
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
            YOUR EVENT HAS ITS OWN INBOX
          </Typography.H5>
          <Typography.Text>
            Receive emails at our hosted inbox! Any emails sent to this address
            will be sent into your event's inbox.
          </Typography.Text>
          <Typography.Text>
            <u>{event.computedExternalContactEmail}</u>
          </Typography.Text>
        </Card>
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
            Your event's website is automatically generated from your event's
            data. We merge locations & timing, common links, images, and contact
            information.
          </Typography.Text>
          <Typography.Text>
            <a href={`https://${event.slug}.geteventpilot.com`} target="_blank">
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
            <Link to="./volunteers/builder">custom fields</Link> into one simple
            form. Share it with volunteers to collect signups easily.
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
      </div>
      <Util.Hr />
      <SelectedInstanceCard />
      {/* <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridGap: "1rem",
        }}
      >
        <Card title="Progress" style={{ gridColumn: "2/4" }}>
          <Row gap={2} align="flex-start">
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
      </div> */}
    </EventPage>
  );
};
