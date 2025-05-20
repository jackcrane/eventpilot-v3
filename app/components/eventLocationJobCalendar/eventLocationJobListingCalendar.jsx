import { useParams } from "react-router-dom";
import { useLocation } from "../../hooks/useLocation";
import { Calendar } from "../calendarView/calendarView";
import { useOffcanvas } from "tabler-react-2";
import { JobCRUD } from "../job/jobCRUD";

export const seed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  return (Math.abs(hash) % 6) + 1;
};

export const EventLocationJobCalendar = ({ locationId }) => {
  const { eventId } = useParams();
  const { location, loading } = useLocation({
    eventId,
    locationId,
    includeShifts: true,
  });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });

  if (loading) return null;

  return (
    <>
      {OffcanvasElement}
      <Calendar
        start={new Date(location.startTime)}
        end={new Date(location.endTime)}
        rows={location.jobs.map((j) => ({
          ...j,
          label: j.name,
          color: seed(j.id),
          items: j.shifts.map((s) => ({
            ...s,
            start: new Date(s.startTime),
            end: new Date(s.endTime),
            color: seed(j.id),
          })),
          onClick: (row) => {
            offcanvas({
              content: (
                <JobCRUD
                  value={row}
                  defaultLocation={location.id}
                  onFinish={close}
                />
              ),
            });
          },
        }))}
        className={"mb-3"}
      />
    </>
  );
};
