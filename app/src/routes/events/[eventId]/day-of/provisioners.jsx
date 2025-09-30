import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input, Typography, useOffcanvas } from "tabler-react-2";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../util/Flex";
import {
  PROVISIONER_PERMISSION_OPTIONS,
  useDayOfProvisioners,
} from "../../../../../hooks/useDayOfProvisioners";
import { ProvisionerTable } from "../../../../../components/dayOfDashboard/ProvisionerTable";
import { useEvent } from "../../../../../hooks/useEvent";
import { useProvisionerModals } from "./useProvisionerModals";

const filterProvisioners = (records, term) => {
  const active = records.filter((record) => !record.deleted);
  if (!term) return active;
  const q = term.toLowerCase();
  return active.filter((record) => {
    const values = [record.name, ...(record.permissions || [])].filter(Boolean);
    return values.some((value) => `${value}`.toLowerCase().includes(q));
  });
};

export const EventProvisionersPage = () => {
  const { eventId } = useParams();
  const { event, loading: eventLoading } = useEvent({ eventId });
  const {
    provisioners,
    loading,
    error,
    createProvisioner,
    updateProvisioner,
  } = useDayOfProvisioners({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1050 },
  });

  const [search, setSearch] = useState("");
  const permissionLabels = useMemo(
    () => new Map(PROVISIONER_PERMISSION_OPTIONS.map(({ value, label }) => [value, label])),
    []
  );

  const defaultTz = event?.defaultTz || "UTC";
  const { openCreate, openEdit, knownPins, shownPins, revealPin } =
    useProvisionerModals({
      defaultTz,
      createProvisioner,
      updateProvisioner,
      offcanvas,
      close,
    });

  const filteredProvisioners = useMemo(
    () => filterProvisioners(provisioners, search),
    [provisioners, search]
  );
  const emptyMessage = search
    ? "No provisioners match your search."
    : "No provisioners yet.";

  return (
    <EventPage
      title="Day-of Provisioners"
      loading={loading || eventLoading}
      description="Manage on-site access codes for staff and volunteers."
    >
      {OffcanvasElement}
      {error && (
        <Typography.Text className="text-danger">
          Failed to load provisioners. Please try again.
        </Typography.Text>
      )}
      <Row className="mb-3" gap={1} align="center" wrap>
        <div style={{ flex: 1, minWidth: 260 }}>
          <Input
            placeholder="Search provisioners..."
            value={search}
            onChange={setSearch}
            noMargin
          />
        </div>
        <Button variant="primary" onClick={openCreate}>
          Create provisioner
        </Button>
      </Row>
      <ProvisionerTable
        provisioners={filteredProvisioners}
        permissionLabels={permissionLabels}
        shownPins={shownPins}
        knownPins={knownPins}
        onRevealPin={revealPin}
        onEditProvisioner={openEdit}
        emptyMessage={emptyMessage}
      />
    </EventPage>
  );
};

export default EventProvisionersPage;
