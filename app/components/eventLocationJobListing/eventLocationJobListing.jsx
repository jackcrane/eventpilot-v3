import { useParams } from "react-router-dom";
import { useLocation } from "../../hooks/useLocation";
import {
  useOffcanvas,
  Typography,
  Table,
  Button,
  Dropdown,
  useConfirm,
  Modal,
  EnclosedSelectGroup,
} from "tabler-react-2";
import React, { useEffect, useState } from "react";
import { Empty } from "../empty/Empty";
import { JobCRUD } from "../job/jobCRUD";
import { Icon } from "../../util/Icon";
import { useJobs } from "../../hooks/useJobs";
import { Loading } from "../loading/Loading";
import { Col, Row } from "../../util/Flex";
import { LocationCRUD } from "../locationCRUD/locationCRUD";
import moment from "moment-timezone";
import { formatDate } from "../tzDateTime/tzDateTime";

const RESTRICTIONS_MAP = {
  OVER_18: "Must be over 18",
  OVER_21: "Must be over 21",
  SPECIAL_CERT_REQUIRED: "Special certification required",
  PHYSICAL_ABILITY: "Must be physically able-bodied",
  OTHER: "Other",
};

export const EventLocationJobListing = ({ locationId }) => {
  const { eventId } = useParams();
  const { location, loading, deleteLocation } = useLocation({
    eventId,
    locationId,
  });
  const {
    jobs,
    deleteJob,
    loading: jobsLoading,
  } = useJobs({ eventId, locationId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });

  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure?",
    text: "You are about to delete this location. This will also delete all associated jobs and shifts. Any volunteers registered for these shifts will be unassigned.",
    commitText: "Delete",
    cancelText: "Cancel",
  });

  const [rearrangeModal, setRearrangeModal] = useState(false);

  const [fieldsToShow, setFieldsToShow] = useState([
    "name",
    // "description",
    // "address",
    // "city",
    // "state",
    "startTime",
    "endTime",
    // "restrictions",
    "shifts.length",
  ]);

  if (loading) return <Loading />;

  if (!location) return null;

  return (
    <div className="mb-4" key={location.id}>
      {ConfirmModal}
      {OffcanvasElement}
      <RearrangeModalComponent
        rearrangeModal={rearrangeModal}
        setRearrangeModal={setRearrangeModal}
        fieldsToShow={fieldsToShow}
        setFieldsToShow={setFieldsToShow}
      />
      <Row justify="space-between" align="center">
        <Col align="flex-start">
          <Typography.H6 className="text-muted mb-0">LOCATION</Typography.H6>
          <Typography.H2 className="mt-0 mb-0">{location.name}</Typography.H2>
          <Typography.H5 className="text-muted">
            {[location.address, location.city, location.state]
              .filter((v) => v.length > 0)
              .join(", ")}
            {location.startTime && (
              <span style={{ marginLeft: "1rem" }}>
                <Icon i="clock" />
                <span className="text-muted">
                  {formatDate(
                    location.startTime,
                    location.startTimeTz,
                    "MMM DD, h:mm a"
                  )}
                </span>
              </span>
            )}
            {location.endTime && (
              <>
                <span className="text-muted">
                  {location.startTime ? " - " : ""}
                  {formatDate(
                    location.endTime,
                    location.endTimeTz,
                    "MMM DD, h:mm a"
                  )}
                </span>
              </>
            )}
          </Typography.H5>
        </Col>
        <Row gap={1}>
          <Dropdown
            prompt="Actions"
            items={[
              {
                text: "Pick Columns to render",
                onclick: () => setRearrangeModal(true),
              },
              {
                type: "divider",
              },
              {
                text: "Edit Location",
                onclick: () =>
                  offcanvas({
                    content: <LocationCRUD value={location} close={close} />,
                  }),
              },
              {
                text: <span className="text-danger">Delete Location</span>,
                onclick: async () => {
                  if (await confirm()) deleteLocation();
                },
              },
            ]}
          />
          <Button
            onClick={() =>
              offcanvas({
                content: (
                  <JobCRUD defaultLocation={location.id} onFinish={close} />
                ),
              })
            }
          >
            <Row gap={1}>
              <Icon i="edit" />
              Create Job
            </Row>
          </Button>
        </Row>
      </Row>
      {jobsLoading ? (
        <Loading />
      ) : jobs?.length === 0 ? (
        <Empty
          onCtaClick={() =>
            offcanvas({
              content: (
                <JobCRUD defaultLocation={location.id} onFinish={close} />
              ),
            })
          }
          ctaText="Create a Job"
        />
      ) : (
        <>
          <Table
            className="card"
            columns={[
              {
                label: "Name",
                accessor: "name",
                sortable: true,
                _showTracker: "name",
              },
              {
                label: "Description",
                accessor: "description",
                _showTracker: "description",
                render: (v) => v || <i>None</i>,
                sortable: true,
              },
              {
                label: "Address",
                accessor: "address",
                _showTracker: "address",
                render: (v) => v || <i>None</i>,
                sortable: true,
              },
              {
                label: "City",
                accessor: "city",
                _showTracker: "city",
                render: (v) => v || <i>None</i>,
                sortable: true,
              },
              {
                label: "State",
                accessor: "state",
                _showTracker: "state",
                render: (v) => v || <i>None</i>,
                sortable: true,
              },
              {
                label: "Start Time (first shift)",
                accessor: "startTime",
                render: (v, r) =>
                  formatDate(r.shifts[0]?.startTime, r.shifts[0]?.startTimeTz),
                _showTracker: "startTime",
                sortable: true,
                sortFn: (a, b) => {
                  let c = a?.shifts[a?.shifts?.length - 1]?.endTime;
                  let d = b?.shifts[b?.shifts?.length - 1]?.endTime;
                  if (!c) return 1;
                  if (!d) return -1;
                  return moment(c).isAfter(d) ? 1 : -1;
                },
              },
              {
                label: "End Time (last shift)",
                accessor: "endTime",
                render: (v, r) =>
                  formatDate(
                    r.shifts[r.shifts.length - 1]?.endTime,
                    r.shifts[r.shifts.length - 1]?.endTimeTz
                  ),
                _showTracker: "endTime",
                sortable: true,
                sortFn: (a, b) => {
                  let c = a?.shifts[a?.shifts?.length - 1]?.endTime;
                  let d = b?.shifts[b?.shifts?.length - 1]?.endTime;
                  if (!c) return 1;
                  if (!d) return -1;
                  return moment(c).isAfter(d) ? 1 : -1;
                },
              },
              {
                label: "Capacity",
                accessor: "capacity",
                render: (c) => (c === 0 ? "Unlimited" : c),
                sortable: true,
                _showTracker: "capacity",
              },
              {
                label: "Shift Count",
                accessor: "shifts.length",
                _showTracker: "shifts.length",
                sortable: true,
              },
              {
                label: "Restrictions",
                accessor: "restrictions",
                render: (r) =>
                  r.length > 1 ? (
                    r.map((i) => RESTRICTIONS_MAP[i]).join(", ")
                  ) : (
                    <i>None</i>
                  ),
                _showTracker: "restrictions",
                sortable: true,
                sortFn: (a, b) => {
                  let c = a?.restrictions?.length;
                  let d = b?.restrictions?.length;
                  if (!c) return 1;
                  if (!d) return -1;
                  return c - d;
                },
              },
              {
                label: "Actions",
                accessor: "id",
                _showTracker: "REQD",
                render: (id, row) => (
                  <Row gap={1}>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (
                          await confirm({
                            text: "You are about to delete this job. This will also delete all associated shifts. Any volunteers registered for these shifts will be unassigned.",
                          })
                        )
                          deleteJob(id);
                      }}
                      variant="danger"
                      outline
                    >
                      <Icon i="trash" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        offcanvas({
                          content: (
                            <JobCRUD
                              value={row}
                              defaultLocation={location.id}
                              onFinish={close}
                            />
                          ),
                        })
                      }
                    >
                      <Icon i="info-circle" />
                      Details
                    </Button>
                  </Row>
                ),
              },
            ].filter((f) => [...fieldsToShow, "REQD"].includes(f._showTracker))}
            data={jobs}
          />
        </>
      )}
    </div>
  );
};
const RearrangeModalComponent = ({
  rearrangeModal,
  setRearrangeModal,
  fieldsToShow,
  setFieldsToShow,
}) => {
  return (
    <Modal
      open={rearrangeModal}
      onClose={() => setRearrangeModal(false)}
      title="Pick Columns"
    >
      <div className="mb-3">
        We gather a lot of data about your locations, but you can choose which
        are shown to you in the table.
      </div>

      <EnclosedSelectGroup
        items={[
          { value: "name", label: "Name" },
          { value: "description", label: "Description" },
          { value: "address", label: "Address" },
          { value: "city", label: "City" },
          { value: "state", label: "State" },
          {
            value: "startTime",
            label: "Start Time (the time the first shift starts)",
          },
          {
            value: "endTime",
            label: "End Time (the time the last shift ends)",
          },
          { value: "shifts.length", label: "Shift Count" },
          { value: "restrictions", label: "Restrictions" },
        ]}
        value={fieldsToShow?.map((f) => ({ value: f })) || []}
        onChange={(v) => setFieldsToShow(v.map((f) => f.value))}
        direction="column"
        multiple
      />
    </Modal>
  );
};
