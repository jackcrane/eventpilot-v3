import { useParams } from "react-router-dom";
import { useLocation } from "../../hooks/useLocation";
import {
  useOffcanvas,
  Typography,
  Table,
  Button,
  Dropdown,
  useConfirm,
} from "tabler-react-2";
import React, { useEffect, useState } from "react";
import { Empty } from "../empty/Empty";
import { JobCRUD } from "../job/jobCRUD";
import { Icon } from "../../util/Icon";
import { useJobs } from "../../hooks/useJobs";
import { Loading } from "../loading/Loading";
import { Col, Row } from "../../util/Flex";
import { LocationCRUD } from "../locationCRUD/locationCRUD";

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

  if (loading) return <Loading />;

  if (!location) return null;

  return (
    <div className="mb-4" key={location.id}>
      {ConfirmModal}
      {OffcanvasElement}
      <Row justify="space-between" align="center">
        <Col align="flex-start">
          <Typography.H6 className="text-muted mb-0">LOCATION</Typography.H6>
          <Typography.H2 className="mt-0 mb-0">{location.name}</Typography.H2>
          <Typography.H5 className="text-muted">
            {[location.address, location.city, location.state]
              .filter((v) => v.length > 0)
              .join(", ")}
          </Typography.H5>
        </Col>
        <Row gap={1}>
          <Dropdown
            prompt="Actions"
            items={[
              {
                text: "Edit",
                onclick: () =>
                  offcanvas({
                    content: <LocationCRUD value={location} close={close} />,
                  }),
              },
              {
                text: <span className="text-danger">Delete</span>,
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
        // JSON.stringify(jobs)
        <Table
          className="card"
          columns={[
            {
              label: "Name",
              accessor: "name",
              sortable: true,
            },
            {
              label: "Capacity",
              accessor: "capacity",
              render: (c) => (c === 0 ? "Unlimited" : c),
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
            },
            {
              label: "Actions",
              accessor: "id",
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
          ]}
          data={jobs}
        />
      )}
    </div>
  );
};
