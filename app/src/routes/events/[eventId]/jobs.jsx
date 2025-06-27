import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { Button, Typography, Util } from "tabler-react-2";
import React from "react";
import { LocationCRUD } from "../../../../components/locationCRUD/locationCRUD";
import { useLocations } from "../../../../hooks/useLocations";
import { useParams } from "react-router-dom";
import { EventLocationJobListing } from "../../../../components/eventLocationJobListing/eventLocationJobListing";
import { FieldsToShowProvider } from "../../../../hooks/useFieldsToShow";
import { useTourManager } from "../../../../components/tourManager/TourManager";

export const EventJobs = () => {
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });
  const { eventId } = useParams();
  const { locations, loading } = useLocations({ eventId });
  const { startTour } = useTourManager();

  return (
    <EventPage title="Jobs" tour={() => startTour("jobs")}>
      {OffcanvasElement}
      <Typography.Text>
        EventPilot uses locations to help you manage your volunteers. Events are
        organized into multiple locations, each location can have multiple jobs,
        and each job can have multiple shifts. If your event is a small event
        that is only at one location, you can just create one location. If your
        event is large that spans multiple locations, you can create multiple
        locations.
      </Typography.Text>
      <Typography.Text>
        We recommend creating a different location for each of your event's
        venue locations or seperate locations for seperate components of your
        event. For example, if you have a packet pick-up on a friday night and a
        race on saturday, you might create two locations, even if they are both
        physically located in the same place.
      </Typography.Text>
      <Button
        onClick={() => offcanvas({ content: <LocationCRUD close={close} /> })}
        className={"tour__create-location"}
      >
        Create a Location
      </Button>
      <Util.Hr />
      <FieldsToShowProvider>
        {locations?.map((location) => (
          <EventLocationJobListing key={location.id} locationId={location.id} />
        ))}
      </FieldsToShowProvider>
      {locations?.length > 0 && (
        <>
          <Util.Hr />
          <Button
            onClick={() =>
              offcanvas({
                content: <LocationCRUD close={close} />,
              })
            }
          >
            Create a Location
          </Button>
        </>
      )}
    </EventPage>
  );
};
