import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { Button, Typography, Util } from "tabler-react-2";
import React from "react";
import { JobCRUD } from "../../../../components/job/jobCRUD";
import { LocationCRUD } from "../../../../components/locationCRUD/locationCRUD";
import { useLocations } from "../../../../hooks/useLocations";
import { useParams } from "react-router-dom";
import { Empty } from "../../../../components/empty/Empty";
import { EventLocationJobListing } from "../../../../components/eventLocationJobListing/eventLocationJobListing";

export const EventJobs = () => {
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });
  const { eventId } = useParams();
  const { locations, loading } = useLocations({ eventId });

  return (
    <EventPage title="Jobs">
      {OffcanvasElement}
      <Button
        onClick={() =>
          offcanvas({
            content: <JobCRUD onFinish={close} />,
          })
        }
      >
        Create a Job
      </Button>
      <Button onClick={() => offcanvas({ content: <LocationCRUD /> })}>
        Create a Location
      </Button>
      <Util.Hr />
      {locations?.map((location) => (
        <EventLocationJobListing key={location.id} locationId={location.id} />
      ))}
    </EventPage>
  );
};
